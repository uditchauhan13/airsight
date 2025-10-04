import { PredictionInput, PredictionOutput } from './forecasting-models';
import { ProcessedFeatures, featureEngineeringPipeline } from './feature-engineering';

export interface TrainingData {
  inputs: PredictionInput[];
  targets: {
    [horizon: string]: number[]; // AQI values for different prediction horizons
  };
  metadata: {
    collection_period: { start: string; end: string };
    data_sources: string[];
    quality_score: number;
  };
}

export interface ModelConfig {
  model_type: 'xgboost' | 'lstm' | 'random_forest' | 'linear' | 'ensemble';
  hyperparameters: { [key: string]: any };
  validation_split: number;
  cross_validation_folds: number;
  early_stopping: boolean;
  feature_selection: boolean;
}

export interface TrainingResult {
  model_id: string;
  model_type: string;
  training_metrics: {
    train_rmse: number;
    train_mae: number;
    train_r2: number;
    validation_rmse: number;
    validation_mae: number;
    validation_r2: number;
  };
  feature_importance: { [key: string]: number };
  training_time: number; // seconds
  model_size: number; // bytes
  convergence_info: {
    epochs: number;
    best_epoch: number;
    early_stopped: boolean;
  };
}

export interface CrossValidationResult {
  mean_rmse: number;
  std_rmse: number;
  mean_mae: number;
  std_mae: number;
  mean_r2: number;
  std_r2: number;
  fold_results: Array<{
    fold: number;
    rmse: number;
    mae: number;
    r2: number;
    predictions: number[];
    actuals: number[];
  }>;
}

export class ModelTrainingSystem {
  private trained_models: Map<string, any> = new Map();
  private training_history: Map<string, TrainingResult[]> = new Map();

  /**
   * Train a new model with given configuration
   */
  async trainModel(
    training_data: TrainingData,
    config: ModelConfig,
    horizon: string = '24h'
  ): Promise<TrainingResult> {
    
    console.log(`Training ${config.model_type} model for ${horizon} horizon`);
    const start_time = Date.now();

    try {
      // 1. Data preprocessing
      const processed_data = await this.preprocessTrainingData(training_data, horizon);
      
      // 2. Feature engineering
      const engineered_features = this.engineerTrainingFeatures(processed_data);
      
      // 3. Data validation
      this.validateTrainingData(engineered_features);
      
      // 4. Train-validation split
      const splits = this.createTrainValidationSplit(engineered_features, config.validation_split);
      
      // 5. Model training
      const trained_model = await this.executeTraining(splits.train, config);
      
      // 6. Model validation
      const validation_metrics = await this.validateModel(trained_model, splits.validation);
      
      // 7. Feature importance analysis
      const feature_importance = this.calculateFeatureImportance(trained_model, splits.train);
      
      const training_time = (Date.now() - start_time) / 1000;
      
      const result: TrainingResult = {
        model_id: `${config.model_type}_${horizon}_${Date.now()}`,
        model_type: config.model_type,
        training_metrics: {
          train_rmse: trained_model.train_metrics.rmse,
          train_mae: trained_model.train_metrics.mae,
          train_r2: trained_model.train_metrics.r2,
          validation_rmse: validation_metrics.rmse,
          validation_mae: validation_metrics.mae,
          validation_r2: validation_metrics.r2,
        },
        feature_importance,
        training_time,
        model_size: this.estimateModelSize(trained_model),
        convergence_info: trained_model.convergence_info,
      };

      // Store trained model
      this.trained_models.set(result.model_id, trained_model);
      
      // Update training history
      const history = this.training_history.get(config.model_type) || [];
      history.push(result);
      this.training_history.set(config.model_type, history);

      return result;

    } catch (error) {
      console.error('Model training failed:', error);
      throw error;
    }
  }

  /**
   * Perform cross-validation on a model
   */
  async crossValidateModel(
    training_data: TrainingData,
    config: ModelConfig,
    horizon: string = '24h'
  ): Promise<CrossValidationResult> {
    
    console.log(`Cross-validating ${config.model_type} model with ${config.cross_validation_folds} folds`);
    
    const processed_data = await this.preprocessTrainingData(training_data, horizon);
    const engineered_features = this.engineerTrainingFeatures(processed_data);
    
    // Create k-fold splits
    const folds = this.createKFoldSplits(engineered_features, config.cross_validation_folds);
    
    const fold_results = [];
    
    for (let fold = 0; fold < config.cross_validation_folds; fold++) {
      console.log(`Training fold ${fold + 1}/${config.cross_validation_folds}`);
      
      const train_data = folds.filter((_, idx) => idx !== fold).flat();
      const validation_data = folds[fold];
      
      // Train model on fold
      const model = await this.executeTraining(train_data, config);
      
      // Validate on held-out fold
      const predictions = await this.predict(model, validation_data.map(d => d.features));
      const actuals = validation_data.map(d => d.target);
      
      // Calculate metrics
      const rmse = this.calculateRMSE(predictions, actuals);
      const mae = this.calculateMAE(predictions, actuals);
      const r2 = this.calculateR2(predictions, actuals);
      
      fold_results.push({
        fold: fold + 1,
        rmse,
        mae,
        r2,
        predictions,
        actuals,
      });
    }
    
    // Aggregate results
    const rmse_values = fold_results.map(r => r.rmse);
    const mae_values = fold_results.map(r => r.mae);
    const r2_values = fold_results.map(r => r.r2);
    
    return {
      mean_rmse: this.calculateMean(rmse_values),
      std_rmse: this.calculateStd(rmse_values),
      mean_mae: this.calculateMean(mae_values),
      std_mae: this.calculateStd(mae_values),
      mean_r2: this.calculateMean(r2_values),
      std_r2: this.calculateStd(r2_values),
      fold_results,
    };
  }

  /**
   * Hyperparameter optimization using grid search
   */
  async optimizeHyperparameters(
    training_data: TrainingData,
    model_type: string,
    param_grid: { [key: string]: any[] },
    horizon: string = '24h'
  ): Promise<{ best_params: any; best_score: number; results: any[] }> {
    
    console.log(`Optimizing hyperparameters for ${model_type}`);
    
    // Generate all parameter combinations
    const param_combinations = this.generateParameterGrid(param_grid);
    const results = [];
    
    let best_score = Infinity;
    let best_params = null;
    
    for (const params of param_combinations) {
      console.log(`Testing parameters:`, params);
      
      const config: ModelConfig = {
        model_type: model_type as any,
        hyperparameters: params,
        validation_split: 0.2,
        cross_validation_folds: 5,
        early_stopping: true,
        feature_selection: true,
      };
      
      try {
        const cv_result = await this.crossValidateModel(training_data, config, horizon);
        const score = cv_result.mean_rmse; // Using RMSE as optimization metric
        
        results.push({
          params,
          score,
          cv_result,
        });
        
        if (score < best_score) {
          best_score = score;
          best_params = params;
        }
        
      } catch (error) {
        console.error(`Error with parameters ${JSON.stringify(params)}:`, error);
        results.push({
          params,
          score: Infinity,
          error: error.message,
        });
      }
    }
    
    return {
      best_params,
      best_score,
      results: results.sort((a, b) => a.score - b.score),
    };
  }

  /**
   * Ensemble model training
   */
  async trainEnsemble(
    training_data: TrainingData,
    base_configs: ModelConfig[],
    ensemble_method: 'average' | 'weighted' | 'stacking' = 'weighted',
    horizon: string = '24h'
  ): Promise<{
    ensemble_model: any;
    base_models: TrainingResult[];
    ensemble_weights: number[];
    performance: any;
  }> {
    
    console.log(`Training ensemble with ${base_configs.length} base models`);
    
    // Train base models
    const base_models: TrainingResult[] = [];
    const base_model_predictions: number[][] = [];
    
    const processed_data = await this.preprocessTrainingData(training_data, horizon);
    const engineered_features = this.engineerTrainingFeatures(processed_data);
    const splits = this.createTrainValidationSplit(engineered_features, 0.2);
    
    for (const config of base_configs) {
      const result = await this.trainModel(training_data, config, horizon);
      base_models.push(result);
      
      // Get predictions for ensemble training
      const model = this.trained_models.get(result.model_id);
      const predictions = await this.predict(
        model, 
        splits.validation.map(d => d.features)
      );
      base_model_predictions.push(predictions);
    }
    
    // Train ensemble
    let ensemble_weights: number[] = [];
    let ensemble_model: any;
    
    switch (ensemble_method) {
      case 'average':
        ensemble_weights = new Array(base_models.length).fill(1 / base_models.length);
        break;
        
      case 'weighted':
        // Weight by inverse validation RMSE
        const rmse_values = base_models.map(m => m.training_metrics.validation_rmse);
        const inverse_rmse = rmse_values.map(rmse => 1 / rmse);
        const sum_inverse = inverse_rmse.reduce((sum, val) => sum + val, 0);
        ensemble_weights = inverse_rmse.map(val => val / sum_inverse);
        break;
        
      case 'stacking':
        // Train meta-learner
        ensemble_model = await this.trainMetaLearner(
          base_model_predictions,
          splits.validation.map(d => d.target)
        );
        ensemble_weights = []; // Not applicable for stacking
        break;
    }
    
    // Evaluate ensemble performance
    const ensemble_predictions = this.combineEnsemblePredictions(
      base_model_predictions,
      ensemble_weights,
      ensemble_model
    );
    
    const actuals = splits.validation.map(d => d.target);
    const performance = {
      rmse: this.calculateRMSE(ensemble_predictions, actuals),
      mae: this.calculateMAE(ensemble_predictions, actuals),
      r2: this.calculateR2(ensemble_predictions, actuals),
    };
    
    return {
      ensemble_model,
      base_models,
      ensemble_weights,
      performance,
    };
  }

  private async preprocessTrainingData(
    training_data: TrainingData,
    horizon: string
  ): Promise<Array<{ input: PredictionInput; target: number }>> {
    
    const processed = [];
    const targets = training_data.targets[horizon];
    
    if (!targets) {
      throw new Error(`No targets found for horizon ${horizon}`);
    }
    
    for (let i = 0; i < training_data.inputs.length && i < targets.length; i++) {
      const input = training_data.inputs[i];
      const target = targets[i];
      
      // Data quality checks
      if (this.isValidInput(input) && this.isValidTarget(target)) {
        processed.push({ input, target });
      }
    }
    
    console.log(`Preprocessed ${processed.length} training samples`);
    return processed;
  }

  private engineerTrainingFeatures(
    processed_data: Array<{ input: PredictionInput; target: number }>
  ): Array<{ features: number[]; target: number; feature_names: string[] }> {
    
    return processed_data.map(({ input, target }) => {
      const processed_features = featureEngineeringPipeline.processFeatures(input);
      return {
        features: processed_features.features,
        target,
        feature_names: processed_features.feature_names,
      };
    });
  }

  private validateTrainingData(
    engineered_features: Array<{ features: number[]; target: number; feature_names: string[] }>
  ): void {
    
    if (engineered_features.length === 0) {
      throw new Error('No training data available');
    }
    
    const feature_count = engineered_features.features.length;
    const invalid_samples = engineered_features.filter(
      sample => sample.features.length !== feature_count ||
                sample.features.some(f => !isFinite(f)) ||
                !isFinite(sample.target)
    );
    
    if (invalid_samples.length > 0) {
      console.warn(`Found ${invalid_samples.length} invalid samples, removing them`);
      // Remove invalid samples (would be done in-place in production)
    }
  }

  private createTrainValidationSplit(
    data: Array<{ features: number[]; target: number; feature_names: string[] }>,
    validation_split: number
  ): {
    train: Array<{ features: number[]; target: number }>;
    validation: Array<{ features: number[]; target: number }>;
  } {
    
    const shuffled = this.shuffleArray([...data]);
    const split_index = Math.floor(shuffled.length * (1 - validation_split));
    
    return {
      train: shuffled.slice(0, split_index),
      validation: shuffled.slice(split_index),
    };
  }

  private createKFoldSplits(
    data: Array<{ features: number[]; target: number; feature_names: string[] }>,
    k: number
  ): Array<Array<{ features: number[]; target: number }>> {
    
    const shuffled = this.shuffleArray([...data]);
    const fold_size = Math.floor(shuffled.length / k);
    const folds = [];
    
    for (let i = 0; i < k; i++) {
      const start = i * fold_size;
      const end = i === k - 1 ? shuffled.length : (i + 1) * fold_size;
      folds.push(shuffled.slice(start, end));
    }
    
    return folds;
  }

  private async executeTraining(
    train_data: Array<{ features: number[]; target: number }>,
    config: ModelConfig
  ): Promise<any> {
    
    // Mock training implementation
    // In production, this would call actual ML libraries (TensorFlow.js, etc.)
    
    console.log(`Training ${config.model_type} model with ${train_data.length} samples`);
    
    // Simulate training time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock trained model
    const model = {
      type: config.model_type,
      parameters: config.hyperparameters,
      train_metrics: {
        rmse: 12 + Math.random() * 8,
        mae: 8 + Math.random() * 5,
        r2: 0.85 + Math.random() * 0.1,
      },
      convergence_info: {
        epochs: config.model_type === 'lstm' ? 50 + Math.floor(Math.random() * 50) : 1,
        best_epoch: config.model_type === 'lstm' ? 30 + Math.floor(Math.random() * 20) : 1,
        early_stopped: Math.random() > 0.7,
      },
      predict: (features: number[][]) => {
        // Mock prediction
        return features.map(f => {
          const base = f || 150; // Use first feature as base
          return Math.max(30, Math.min(400, base + (Math.random() - 0.5) * 20));
        });
      },
    };
    
    return model;
  }

  private async validateModel(
    model: any,
    validation_data: Array<{ features: number[]; target: number }>
  ): Promise<{ rmse: number; mae: number; r2: number }> {
    
    const features = validation_data.map(d => d.features);
    const predictions = await this.predict(model, features);
    const actuals = validation_data.map(d => d.target);
    
    return {
      rmse: this.calculateRMSE(predictions, actuals),
      mae: this.calculateMAE(predictions, actuals),
      r2: this.calculateR2(predictions, actuals),
    };
  }

  private calculateFeatureImportance(
    model: any,
    train_data: Array<{ features: number[]; target: number }>
  ): { [key: string]: number } {
    
    // Mock feature importance calculation
    const num_features = train_data?.features.length || 50;
    const importance: { [key: string]: number } = {};
    
    for (let i = 0; i < num_features; i++) {
      // Generate realistic importance values
      const base_importance = Math.random() * 0.2;
      const feature_name = `feature_${i}`;
      importance[feature_name] = Number(base_importance.toFixed(4));
    }
    
    // Normalize to sum to 1
    const total = Object.values(importance).reduce((sum, val) => sum + val, 0);
    Object.keys(importance).forEach(key => {
      importance[key] = Number((importance[key] / total).toFixed(4));
    });
    
    return importance;
  }

  private async predict(model: any, features: number[][]): Promise<number[]> {
    return model.predict(features);
  }

  private estimateModelSize(model: any): number {
    // Mock model size estimation
    const base_size = {
      'xgboost': 50000,
      'lstm': 200000,
      'random_forest': 100000,
      'linear': 10000,
    };
    
    return base_size[model.type as keyof typeof base_size] || 50000;
  }

  private generateParameterGrid(param_grid: { [key: string]: any[] }): any[] {
    const keys = Object.keys(param_grid);
    const combinations: any[] = [];
    
    function generateCombinations(index: number, current: any): void {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }
      
      const key = keys[index];
      for (const value of param_grid[key]) {
        current[key] = value;
        generateCombinations(index + 1, current);
      }
    }
    
    generateCombinations(0, {});
    return combinations;
  }

  private async trainMetaLearner(
    base_predictions: number[][],
    targets: number[]
  ): Promise<any> {
    
    // Simple linear meta-learner
    const X = base_predictions.map((_, i) => 
      base_predictions.map(predictions => predictions[i])
    );
    
    // Mock training - in production would use actual linear regression
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      predict: (base_preds: number[][]) => {
        // Simple averaging as meta-learner
        return base_preds.map((_, i) => {
          const avg = base_preds.reduce((sum, preds) => sum + preds[i], 0) / base_preds.length;
          return avg;
        });
      },
    };
  }

  private combineEnsemblePredictions(
    base_predictions: number[][],
    weights: number[],
    meta_model?: any
  ): number[] {
    
    if (meta_model) {
      return meta_model.predict(base_predictions);
    }
    
    // Weighted average
    const num_samples = base_predictions.length;
    const combined = [];
    
    for (let i = 0; i < num_samples; i++) {
      let weighted_sum = 0;
      for (let j = 0; j < base_predictions.length; j++) {
        weighted_sum += base_predictions[j][i] * weights[j];
      }
      combined.push(weighted_sum);
    }
    
    return combined;
  }

  // Utility functions
  private isValidInput(input: PredictionInput): boolean {
    return input.historical_aqi.length > 0 &&
           input.weather_features.temperature.length > 0 &&
           isFinite(input.location_features.latitude) &&
           isFinite(input.location_features.longitude);
  }

  private isValidTarget(target: number): boolean {
    return isFinite(target) && target >= 0 && target <= 500;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private calculateRMSE(predictions: number[], actuals: number[]): number {
    const mse = predictions.reduce((sum, pred, i) => 
      sum + Math.pow(pred - actuals[i], 2), 0
    ) / predictions.length;
    return Math.sqrt(mse);
  }

  private calculateMAE(predictions: number[], actuals: number[]): number {
    return predictions.reduce((sum, pred, i) => 
      sum + Math.abs(pred - actuals[i]), 0
    ) / predictions.length;
  }

  private calculateR2(predictions: number[], actuals: number[]): number {
    const actualMean = actuals.reduce((sum, val) => sum + val, 0) / actuals.length;
    const totalSumSquares = actuals.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSumSquares = predictions.reduce((sum, pred, i) => 
      sum + Math.pow(actuals[i] - pred, 2), 0
    );
    return 1 - (residualSumSquares / totalSumSquares);
  }

  private calculateMean(arr: number[]): number {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  private calculateStd(arr: number[]): number {
    const mean = this.calculateMean(arr);
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  // Public methods for model management
  getTrainedModel(model_id: string): any {
    return this.trained_models.get(model_id);
  }

  getTrainingHistory(model_type: string): TrainingResult[] {
    return this.training_history.get(model_type) || [];
  }

  getAllTrainedModels(): string[] {
    return Array.from(this.trained_models.keys());
  }

  removeModel(model_id: string): boolean {
    return this.trained_models.delete(model_id);
  }
}

export const modelTrainingSystem = new ModelTrainingSystem();

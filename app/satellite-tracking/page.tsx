import { SatelliteTrackingDashboard } from "@/components/satellite-tracking-dashboard"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function SatelliteTrackingPage() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="pt-20">
        <SatelliteTrackingDashboard />
      </main>
      <Footer />
    </div>
  )
}

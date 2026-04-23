import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import BottomTabBar from '@/components/layout/BottomTabBar'
import CinematicIntro from '@/components/onboarding/CinematicIntro'
import TutorialOverlay from '@/components/onboarding/TutorialOverlay'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-60">
        <Topbar />
        <main className="min-h-[calc(100vh-4rem)] p-4 pb-20 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>
      <BottomTabBar />
      <CinematicIntro />
      <TutorialOverlay />
    </div>
  )
}

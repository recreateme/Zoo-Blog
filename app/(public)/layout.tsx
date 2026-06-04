import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CommandSearch from '@/components/search/CommandSearch'
import HomeWelcomePopup from '@/components/home/HomeWelcomePopup'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <HomeWelcomePopup />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CommandSearch />
    </div>
  )
}

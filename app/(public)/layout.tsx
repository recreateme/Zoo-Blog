import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CommandSearch from '@/components/search/CommandSearch'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CommandSearch />
    </div>
  )
}

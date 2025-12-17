
import MintForm from '@/components/MintForm';

export default function Home() {
  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr_auto] p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="flex flex-col gap-4 text-center items-center">
        <h1 className="text-4xl font-bold tracking-tight">NFT Lane Minter</h1>
        <p className="text-lg text-gray-400 max-w-2xl">
          Mint NFTs directly to the Derived Lane.
        </p>
      </header>
      
      <main className="flex flex-col gap-8 items-center w-full max-w-2xl mx-auto">
        <MintForm />
      </main>
      
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-gray-500">
        <div className="flex gap-2 items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Derived Lane: http://127.0.0.1:9545
        </div>
      </footer>
    </div>
  );
}

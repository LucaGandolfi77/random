import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <div className="mb-6 text-8xl">📺</div>
      <h1 className="mb-2 text-4xl font-bold">404</h1>
      <p className="mb-8 text-lg text-muted-foreground">This channel doesn&apos;t exist</p>
      <Link href="/">
        <Button className="bg-reel hover:bg-reel/90">Back to Home</Button>
      </Link>
    </div>
  );
}

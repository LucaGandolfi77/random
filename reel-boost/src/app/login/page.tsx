import { Header } from "@/components/Header";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-[100dvh]">
      <Header />
      <main className="mx-auto mt-10 max-w-sm px-4">
        <h1 className="mb-6 text-2xl font-bold">Log in</h1>
        <LoginForm />
      </main>
    </div>
  );
}
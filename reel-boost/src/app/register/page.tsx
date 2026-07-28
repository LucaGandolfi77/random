import { Header } from "@/components/Header";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-[100dvh]">
      <Header />
      <main className="mx-auto mt-10 max-w-sm px-4">
        <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
        <RegisterForm />
      </main>
    </div>
  );
}
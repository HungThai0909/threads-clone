"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth.service";

const schema = z.object({ email: z.string().email("Invalid email address") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await authService.forgotPassword(data.email);
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (sent) {
    return (
      <div className="animate-fade-in text-center space-y-4">
        <div className="text-5xl">🔒</div>
        <h2 className="text-xl font-bold text-[#f3f3f3]">Check your email</h2>
        <p className="text-[#777] text-sm leading-relaxed">
          If an account exists with that email, we&apos;ve sent a password reset link.
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full mt-4">
            Back to Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-[#777] hover:text-[#f3f3f3] text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className="text-2xl font-bold text-[#f3f3f3] mb-1">Forgot password?</h1>
      <p className="text-[#777] text-sm mb-8">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input {...register("email")} type="email" placeholder="Email address" />
          {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
          {isSubmitting ? <Spinner size="sm" /> : "Send reset link"}
        </Button>
      </form>
    </div>
  );
}

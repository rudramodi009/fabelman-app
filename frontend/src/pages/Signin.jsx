import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

const SignIn = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error } = useAuthStore();

  const handleSignIn = async (e) => {
    e.preventDefault();

    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      toast.error("Please enter your username and password.");
      return;
    }

    try {
      const { message } = await login(trimmedUsername, password);

      toast.success(message);
      navigate("/");
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#101010] px-4 py-8 sm:px-6 md:px-8">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/bg.png')",
        }}
      />

      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-black/70" />

      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#101010]/40 to-[#101010]" />

      <div className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-red-600/10 blur-3xl" />
      <div className="absolute -right-32 bottom-1/4 h-72 w-72 rounded-full bg-red-600/10 blur-3xl" />

      {/* Content */}
      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-full max-w-[430px]">
          {/* Branding */}
          <div className="mb-7 text-center">
            <Link
              to="/"
              className="inline-block text-3xl font-extrabold tracking-tight text-white transition-opacity hover:opacity-80 sm:text-4xl"
            >
              FABELMAN
            </Link>

            <p className="mt-2 text-sm text-white/50">
              Your world of movies, all in one place.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/10 bg-black/65 p-6 shadow-2xl backdrop-blur-xl sm:p-8 md:p-10">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Welcome back
              </h1>

              <p className="mt-2 text-sm text-white/45">
                Sign in to continue exploring Fabelman.
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-5">
              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-white/80"
                >
                  Username
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                  />

                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    disabled={isLoading}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/30 hover:border-white/20 focus:border-red-500/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-white/80"
                >
                  Password
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-11 pr-12 text-sm text-white outline-none transition-all placeholder:text-white/30 hover:border-white/20 focus:border-red-500/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isLoading}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/35 transition-colors hover:text-white disabled:cursor-not-allowed"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                  <p className="text-sm leading-5 text-red-400">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#e50914] text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition-all duration-200 hover:bg-[#f20d19] hover:shadow-red-900/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#e50914]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Sign up */}
            <div className="mt-7 border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-white/40">
                New to Fabelman?{" "}
                <Link
                  to="/signup"
                  className="font-medium text-white transition-colors hover:text-red-400"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>

          {/* Bottom text */}
          <p className="mt-6 text-center text-xs text-white/25">
            Discover. Watch. Enjoy.
          </p>
        </div>
      </div>
    </main>
  );
};

export default SignIn;

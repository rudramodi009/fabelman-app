import { useEffect } from "react";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";

import Navbar from "./components/Navbar";
import Homepage from "./pages/Homepage";
import Moviepage from "./pages/Moviepage";
import SignIn from "./pages/Signin";
import SignUp from "./pages/Signup";
import AIRecommendation from "./pages/AIRecommendation";
import Personpage from "./pages/Personpage";

// --------------------------------------------------
// Loading screen
// --------------------------------------------------

const AuthLoading = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#181818]">
      <p className="text-xl text-white">Loading...</p>
    </div>
  );
};

// --------------------------------------------------
// Protected Route
// --------------------------------------------------

const ProtectedRoute = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  const fetchingUser = useAuthStore((state) => state.fetchingUser);

  // Never make an authentication decision
  // while the session is still being checked.
  if (fetchingUser) {
    return <AuthLoading />;
  }

  // No authenticated user.
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return children;
};

// --------------------------------------------------
// Public Route
// --------------------------------------------------

const PublicRoute = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  const fetchingUser = useAuthStore((state) => state.fetchingUser);

  // Wait until the existing session has been checked.
  if (fetchingUser) {
    return <AuthLoading />;
  }

  // Already authenticated.
  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// --------------------------------------------------
// Application
// --------------------------------------------------

const App = () => {
  const fetchUser = useAuthStore((state) => state.fetchUser);

  const fetchingUser = useAuthStore((state) => state.fetchingUser);

  const location = useLocation();

  // Restore/check authentication session
  // when the application starts.
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Don't render the application until
  // authentication has been checked.
  if (fetchingUser) {
    return <AuthLoading />;
  }

  const hideNavbar =
    location.pathname === "/signin" || location.pathname === "/signup";

  return (
    <>
      <Toaster position="top-right" />

      {!hideNavbar && <Navbar />}

      <Routes>
        {/* ---------------------------------------- */}
        {/* Protected routes */}
        {/* ---------------------------------------- */}

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Homepage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/movie/:id"
          element={
            <ProtectedRoute>
              <Moviepage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recommendation"
          element={
            <ProtectedRoute>
              <AIRecommendation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/person/:id"
          element={
            <ProtectedRoute>
              <Personpage />
            </ProtectedRoute>
          }
        />

        {/* ---------------------------------------- */}
        {/* Public routes */}
        {/* ---------------------------------------- */}

        <Route
          path="/signin"
          element={
            <PublicRoute>
              <SignIn />
            </PublicRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignUp />
            </PublicRoute>
          }
        />

        {/* ---------------------------------------- */}
        {/* 404 */}
        {/* ---------------------------------------- */}

        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center bg-[#181818]">
              <h1 className="text-3xl font-bold text-white">
                404 - Page Not Found
              </h1>
            </div>
          }
        />
      </Routes>
    </>
  );
};

export default App;

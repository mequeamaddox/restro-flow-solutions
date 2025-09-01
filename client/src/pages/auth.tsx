import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-orange-400 blur-3xl"></div>
        <div className="absolute top-40 right-32 w-24 h-24 rounded-full bg-green-400 blur-2xl"></div>
        <div className="absolute bottom-32 left-1/3 w-40 h-40 rounded-full bg-yellow-400 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 rounded-full bg-red-400 blur-2xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">RestroFlow</h1>
          <p className="text-gray-300">Restaurant Operations Platform</p>
        </div>
        
        <LoginForm onToggleMode={() => setIsLogin(!isLogin)} />
        
        <div className="mt-6 text-center text-sm text-gray-400 space-y-3">
          <p>Contact your system administrator for account access</p>
          <div className="border-t border-gray-600 pt-3">
            <a 
              href="/admin" 
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              Administrator? Click here to log in with Replit
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to continue to Agent Paige</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
        </div>
        <p className="text-center mt-6 text-sm text-gray-500">
          Don't have an account?{' '}
          <a href="/sign-up" className="text-blue-600 hover:underline font-medium">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}

import { useUser, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';

export default function AuthButton() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="h-9 w-24 bg-gray-200 rounded-md animate-pulse" />
    );
  }

  if (isSignedIn) {
    return <UserButton afterSignOutUrl="/" />;
  }

  return (
    <div className="flex items-center gap-3">
      <SignInButton mode="modal">
        <button className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
          Sign In
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
          Sign Up
        </button>
      </SignUpButton>
    </div>
  );
}

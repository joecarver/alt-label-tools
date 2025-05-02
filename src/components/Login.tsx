import { useState } from 'react';

export default function Login() {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth');
            const { authUrl } = await response.json();
            window.location.href = authUrl;
        } catch (error) {
            console.error('Error initiating Google login:', error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Sign in to your account
                    </h2>
                </div>
                <div className="mt-8 space-y-6">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <span>Signing in...</span>
                        ) : (
                            <span>Sign in with Google</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
} 
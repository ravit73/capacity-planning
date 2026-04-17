interface Props {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 max-w-sm w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">CP</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Capacity Planning</h1>
        </div>

        <p className="text-sm text-gray-500">
          Sign in with your Microsoft account to continue.
        </p>

        <button
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#0078d4] hover:bg-[#106ebe] text-white text-sm font-medium rounded-md transition-colors"
        >
          <MicrosoftLogo />
          Sign in with Microsoft
        </button>

        <p className="text-xs text-gray-400">
          Access is managed by your organisation's Azure AD.
        </p>
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

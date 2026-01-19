


export default function Login() {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left panel */}
      <div className="hidden md:flex bg-gradient-to-b from-green-800 to-green-600 text-white p-10 items-center">
        <div>
          <h1 className="text-4xl font-bold">
            ADANSI TRAVELS <br /> INVENTORY SYSTEM
          </h1>
          <p className="mt-4 text-green-100">
            Manage your resources efficiently
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 bg-green-700 text-white rounded-full flex items-center justify-center font-bold">
              AT
            </div>
            <span className="font-semibold text-green-700">
              ADANSI TRAVELS
            </span>
          </div>

          <h2 className="text-2xl font-bold mb-6">SIGN IN</h2>

          <input
            type="email"
            placeholder="Email"
            className="w-full mb-4 px-4 py-3 bg-gray-100 rounded outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full mb-6 px-4 py-3 bg-gray-100 rounded outline-none"
          />

          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="w-full bg-black text-white py-3 rounded font-semibold"
          >
            Login
          </button>

         
        </div>
      </div>
    </div>
  );
}








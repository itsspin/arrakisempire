"use client"

import { useState } from "react"
import { auth } from "@/lib/firebase"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message)
      else setError("Authentication failed")
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-stone-900">
      <form
        onSubmit={handleSubmit}
        className="bg-stone-800 p-6 rounded-md space-y-4 w-80"
      >
        <h2 className="text-xl font-bold text-center text-amber-400">
          {isSignUp ? "Create Account" : "Login"}
        </h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 rounded bg-stone-700"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 rounded bg-stone-700"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full py-2 bg-amber-600 hover:bg-amber-700 rounded text-white"
        >
          {isSignUp ? "Sign Up" : "Sign In"}
        </button>
        <p className="text-center text-sm text-stone-300">
          {isSignUp ? "Have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
            }}
            className="text-amber-400 underline"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </form>
    </div>
  )
}

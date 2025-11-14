import { useState, useCallback } from "react"

import type { ActionState, FieldErrors } from "@/lib/create-safe-actions"

type Action<TInput, TOutput> = (data: TInput) => Promise<ActionState<TInput, TOutput>>

interface UseActionOptions<TOutput> {
  onSuccess?: (data: TOutput) => void
  onError?: (error: string) => void
  onComplete?: () => void
}

export const useAction = <TInput, TOutput>(
  action: Action<TInput, TOutput>,
  options: UseActionOptions<TOutput> = {}
) => {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<TInput> | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [data, setData] = useState<TOutput | undefined>(undefined)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const execute = useCallback(
    async (input: TInput) => {
      setIsLoading(true)
      setFieldErrors(undefined)
      setError(undefined)

      try {
        const result = await action(input)
        if (!result) {
          return
        }
          setFieldErrors(result.fieldErrors)
  
        if (result.error) {
          setError(result.error)
          options.onError?.(result.error)
        }

        if (result.data) {
          setData(result.data)
          options.onSuccess?.(result.data)
        }
      } catch (err) {
        // Check if this is a Next.js redirect error - re-throw it so Next.js can handle it
        if (err && typeof err === "object" && ("digest" in err || "type" in err)) {
          const redirectError = err as { digest?: string; type?: string }
          if (redirectError.digest?.startsWith("NEXT_REDIRECT") || redirectError.type === "NEXT_REDIRECT") {
            throw err
          }
        }
        const message = err instanceof Error ? err.message : "Something went wrong"
        setError(message)
        options.onError?.(message)
      } finally {
        setIsLoading(false)
        options.onComplete?.()
      }
    },
    [action, options]
  )

  return {
    execute,
    fieldErrors,
    error,
    data,
    isLoading,
  };
};
"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect, useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Edit, RefreshCw, Phone, X, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Toast Components
const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className,
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

// Toast Hook
const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) return
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({ type: "REMOVE_TOAST", toastId })
  }, TOAST_REMOVE_DELAY)
  toastTimeouts.set(toastId, timeout)
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) }
    case "UPDATE_TOAST":
      return { ...state, toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)) }
    case "DISMISS_TOAST": {
      const { toastId } = action
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => addToRemoveQueue(toast.id))
      }
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === toastId || toastId === undefined ? { ...t, open: false } : t)),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) return { ...state, toasts: [] }
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) }
  }
}

const listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

function toast({ ...props }: Omit<ToasterToast, "id">) {
  const id = genId()
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })
  return { id, dismiss }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)
  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])
  return { ...state, toast }
}

const Toaster = React.memo(() => {
  const { toasts } = useToast()
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
})
Toaster.displayName = "Toaster"

// ---------- Interfaces ----------
interface UserData {
  id: string
  email: string
  oauthId: string
  username: string
  authId: string | null
  token: string | null
  createdAt: string
  updatedAt: string
}

interface CallData {
  id: string
  startTime: string
  conversationStatus: number
  status: number
  from: string
  to: string
  duration: number
  // NLPEarl Tags (list view)
  tags?: string[]
}

interface CallsResponse {
  count: number
  results: CallData[]
}

interface CallsFilters {
  skip: number
  limit: number
  sortProp: string
  isAscending: boolean
  fromDate: string
  toDate: string
  tags: string[]
  statuses: number[]
  searchInput: string
}

interface CallDetails {
  id: string
  relatedId: string | null
  startTime: string
  conversationStatus: number
  status: number
  from: string | null
  to: string | null
  name: string | null
  duration: number
  recording: string | null
  transcript: Array<{
    role: number
    content: string
    startTime: number
    endTime: number
  }> | null
  summary: string | null
  collectedInfo: Array<{
    id: string
    name: string
    value: string | number | boolean | null
  }> | null
  // NLPEarl Tags (details view)
  tags: string[] | null
  isCallTransferred: boolean
  overallSentiment: number
}

// ADD under "Interfaces"
interface CampaignData {
  id: string
  campaignName: string
  outboundId: string
  bearerToken: string
  userId: string
  createdAt: string
  updatedAt: string
}

// ---------- LocalStorage utilities ----------
const STORAGE_KEYS = {
  BEARER_TOKEN: "analytics_bearer_token",
  OUTBOUND_ID: "analytics_outbound_id",
  CAMPAIGN_ID: "analytics_campaign_id", // NEW
}

const saveToLocalStorage = (key: string, value: string) => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(key, value)
    }
  } catch (error) {
    console.warn("Failed to save to localStorage:", error)
  }
}

const getFromLocalStorage = (key: string): string | null => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return localStorage.getItem(key)
    }
  } catch (error) {
    console.warn("Failed to read from localStorage:", error)
  }
  return null
}

const removeFromLocalStorage = (key: string) => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(key)
    }
  } catch (error) {
    console.warn("Failed to remove from localStorage:", error)
  }
}

const clearCallsStorage = () => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    removeFromLocalStorage(key)
  })
}

// ---------- API Base URLs ----------
const API_BASE_URL = "https://whitelabel-server.onrender.com/api/v1"
const CALLS_API_BASE_URL = "https://api.nlpearl.ai/v1"
// ADD next to your API base URLs
const CAMPAIGNS_BASE_URL = "https://whitelabel-server.onrender.com"

// ---------- Helpers ----------
const getDefaultDateRange = () => {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

const getStatusText = (status: number): string => {
  const statusMap: { [key: number]: string } = {
    3: "In Progress",
    4: "Completed",
    5: "Busy",
    6: "Failed",
    7: "No Answer",
    8: "Canceled",
  }
  return statusMap[status] || "Unknown"
}

const getConversationStatusText = (status: number): string => {
  const statusMap: { [key: number]: string } = {
    10: "Need Retry",
    20: "In Call Queue",
    70: "Voice Mail Left",
    100: "Success",
    110: "Not Successful",
    130: "Complete",
    150: "Unreachable",
    500: "Error",
  }
  return statusMap[status] || "Unknown"
}

const getStatusBadgeColor = (status: number): string => {
  switch (status) {
    case 4:
    case 100:
    case 130:
      return "bg-green-100 text-green-800"
    case 6:
    case 110:
    case 500:
      return "bg-red-100 text-red-800"
    case 3:
    case 20:
      return "bg-blue-100 text-blue-800"
    case 5:
    case 7:
    case 150:
      return "bg-purple-100 text-purple-800"
    case 70:
      return "bg-yellow-100 text-yellow-800"
    case 10:
      return "bg-orange-100 text-orange-800"
    case 8:
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString()
}

const getSentimentText = (sentiment: number): string => {
  const sentimentMap: { [key: number]: string } = {
    1: "Negative",
    2: "Slightly Negative",
    3: "Neutral",
    4: "Slightly Positive",
    5: "Positive",
  }
  return sentimentMap[sentiment] || "Unknown"
}

const getSentimentColor = (sentiment: number): string => {
  switch (sentiment) {
    case 1:
      return "text-red-600"
    case 2:
      return "text-orange-600"
    case 3:
      return "text-gray-600"
    case 4:
      return "text-blue-600"
    case 5:
      return "text-green-600"
    default:
      return "text-gray-600"
  }
}

// ---------- Tag helpers (deterministic colors & UI dots) ----------
const TAG_COLOR_CLASSES = [
  "bg-blue-500",
  "bg-pink-400",
  "bg-teal-500",
  "bg-amber-400",
  "bg-violet-500",
  "bg-rose-500",
  "bg-lime-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
] as const

const hashString = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
  return Math.abs(h)
}

const tagBg = (tag: string) => TAG_COLOR_CLASSES[hashString(tag) % TAG_COLOR_CLASSES.length]

const TagDots: React.FC<{ tags?: string[]; max?: number; className?: string }> = ({ tags = [], max = 3, className }) => {
  if (!tags || tags.length === 0) return <span className="text-xs text-gray-400">—</span>
  const shown = tags.slice(0, max)
  const remaining = tags.length - shown.length
  return (
    <div className={cn("flex items-center -space-x-1.5", className)}>
      {shown.map((t, i) => (
        <div
          key={`${t}-${i}`}
          title={t}
          aria-label={t}
          className={cn("h-5 w-5 rounded-full border-2 border-white shadow-sm", tagBg(t))}
        />
      ))}
      {remaining > 0 && (
        <div className="h-5 w-5 rounded-full border-2 border-white bg-gray-200 text-[10px] flex items-center justify-center font-medium">
          +{remaining}
        </div>
      )}
    </div>
  )
}

// ---------- Main Component ----------
const CallsPage = () => {
  const { user, isLoaded } = useUser()
  const { toast } = useToast()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [calls, setCalls] = useState<CallData[]>([])
  const [totalCalls, setTotalCalls] = useState(0)
  const [loading, setLoading] = useState(false)
  const [callsLoading, setCallsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [authId, setAuthId] = useState("")
  const [token, setToken] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCall, setSelectedCall] = useState<CallData | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null)
  const [callDetailsLoading, setCallDetailsLoading] = useState(false)
  const [activeRightTab, setActiveRightTab] = useState<"transcript" | "events">("transcript") // layout-only tabs

  // Filters and pagination
  const [filters, setFilters] = useState<CallsFilters>({
    skip: 0,
    limit: 50,
    sortProp: "startTime",
    isAscending: false,
    fromDate: getDefaultDateRange().from,
    toDate: getDefaultDateRange().to,
    tags: [],
    statuses: [],
    searchInput: "",
  })

  // NEW: campaign state for Calls page
  const [campaigns, setCampaigns] = useState<CampaignData[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(null)
  const [campaignsLoading, setCampaignsLoading] = useState(false)

  // CHANGE: make isConfigured a state (so it updates when we swap campaigns)
  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    const savedBearerToken = getFromLocalStorage(STORAGE_KEYS.BEARER_TOKEN)
    const savedOutboundId = getFromLocalStorage(STORAGE_KEYS.OUTBOUND_ID)
    return !!(savedBearerToken && savedOutboundId)
  })

  const canSubmit = useMemo(() => {
    return authId.trim().length > 0 && token.trim().length > 0 && !submitting
  }, [authId, token, submitting])

  const currentPage = useMemo(() => Math.floor(filters.skip / filters.limit) + 1, [filters.skip, filters.limit])
  const totalPages = useMemo(() => Math.ceil(totalCalls / filters.limit), [totalCalls, filters.limit])

  // Fetch user data
  const fetchUserData = useCallback(
    async (userId: string, showLoader = true) => {
      if (showLoader) setLoading(true)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        const response = await fetch(`${API_BASE_URL}/getUser/${userId}`, {
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache" },
        })
        clearTimeout(timeoutId)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: UserData = await response.json()
        setUserData(data)
        return data
      } catch (error) {
        console.error("Error fetching user data:", error)
        const errorMessage =
          error instanceof Error
            ? error.name === "AbortError"
              ? "Request timed out. Please try again."
              : "Failed to fetch user data. Please try again."
            : "An unexpected error occurred."
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
        return null
      } finally {
        if (showLoader) setLoading(false)
      }
    },
    [toast],
  )

  // Fetch calls data using localStorage credentials
  const fetchCalls = useCallback(
    async (customFilters?: Partial<CallsFilters>) => {
      const savedBearerToken = getFromLocalStorage(STORAGE_KEYS.BEARER_TOKEN)
      const savedOutboundId = getFromLocalStorage(STORAGE_KEYS.OUTBOUND_ID)

      if (!savedBearerToken || !savedOutboundId) {
        setShowModal(true)
        return
      }

      setCallsLoading(true)
      try {
        const currentFilters = { ...filters, ...customFilters }
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)
        const response = await fetch(`${CALLS_API_BASE_URL}/Outbound/${savedOutboundId}/Calls`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${savedBearerToken.replace("Bearer ", "")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(currentFilters),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (!response.ok) {
          let errorMessage = "Failed to fetch calls data."

          switch (response.status) {
            case 401:
              errorMessage = "Invalid bearer token. Please check your authentication credentials."
              break
            case 403:
              errorMessage = "Access denied. Your bearer token may not have the required permissions."
              break
            case 404:
              errorMessage = "Outbound ID not found. Please verify the outbound ID is correct."
              break
            case 400:
              errorMessage = "Invalid request. Please check your outbound ID and bearer token."
              break
            case 500:
              errorMessage = "Server error. Please try again later."
              break
            default:
              errorMessage = `API error (${response.status}). Please check your credentials and try again.`
          }

          throw new Error(errorMessage)
        }
        const data: CallsResponse = await response.json()
        setCalls(data.results)
        setTotalCalls(data.count)
        toast({
          title: "Success",
          description: `Loaded ${data.results.length} calls successfully!`,
        })
      } catch (error) {
        console.error("Error fetching calls:", error)
        let errorMessage = "An unexpected error occurred."

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            errorMessage = "Calls request timed out. Please try again."
          } else {
            errorMessage = error.message
          }
        }

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })

        // Clear localStorage on authentication errors
        if (
          error instanceof Error &&
          (error.message.includes("Invalid bearer token") ||
            error.message.includes("Access denied") ||
            error.message.includes("Outbound ID not found"))
        ) {
          clearCallsStorage()
          setIsConfigured(false)
          setShowModal(true)
        }
      } finally {
        setCallsLoading(false)
      }
    },
    [filters, toast],
  )

  // Fetch detailed call information (includes tags from NLPEarl)
  const fetchCallDetails = useCallback(
    async (callId: string) => {
      const savedBearerToken = getFromLocalStorage(STORAGE_KEYS.BEARER_TOKEN)

      if (!callId || !savedBearerToken) return
      setCallDetailsLoading(true)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)
        const response = await fetch(`${CALLS_API_BASE_URL}/Call/${callId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${savedBearerToken.replace("Bearer ", "")}`,
          },
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: CallDetails = await response.json()
        setCallDetails(data)
      } catch (error) {
        console.error("Error fetching call details:", error)
        const errorMessage =
          error instanceof Error
            ? error.name === "AbortError"
              ? "Call details request timed out. Please try again."
              : "Failed to fetch call details. Please try again."
            : "An unexpected error occurred."
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setCallDetailsLoading(false)
      }
    },
    [toast],
  )

  // NEW: fetch the user's campaigns (same endpoint your Overview page uses)
  const fetchCampaigns = useCallback(
    async (email: string, showToast = false) => {
      if (!email) return []
      setCampaignsLoading(true)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        const res = await fetch(
          `${CAMPAIGNS_BASE_URL}/users/email/${encodeURIComponent(email)}/userdata`,
          { signal: controller.signal, headers: { "Cache-Control": "no-cache" } },
        )
        clearTimeout(timeoutId)

        if (!res.ok) {
          if (res.status === 404) {
            setCampaigns([])
            setSelectedCampaign(null)
            if (showToast) {
              toast({ title: "No campaigns", description: "No campaigns found for this email.", variant: "destructive" })
            }
            return []
          }
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        const data: CampaignData[] = await res.json()
        const list = Array.isArray(data) ? data : []
        setCampaigns(list)

        if (list.length > 0) {
          const savedId = getFromLocalStorage(STORAGE_KEYS.CAMPAIGN_ID)
          const initial = savedId ? list.find((c) => c.id === savedId) : list[0]
          if (initial) {
            setSelectedCampaign(initial)
            saveToLocalStorage(STORAGE_KEYS.CAMPAIGN_ID, initial.id)
            saveToLocalStorage(STORAGE_KEYS.BEARER_TOKEN, initial.bearerToken)
            saveToLocalStorage(STORAGE_KEYS.OUTBOUND_ID, initial.outboundId)
            setIsConfigured(true)
            await fetchCalls() // immediately refresh calls for the selected campaign
          }
        }
        return data
      } catch (err) {
        console.error("Error fetching campaigns:", err)
        toast({ title: "Error", description: "Failed to fetch campaigns.", variant: "destructive" })
        setCampaigns([])
        return []
      } finally {
        setCampaignsLoading(false)
      }
    },
    [fetchCalls, toast],
  )

  // NEW: when user changes the campaign from the Select
  const handleCampaignChange = useCallback(
    async (campaignId: string) => {
      const campaign = campaigns.find((c) => c.id === campaignId)
      if (!campaign) return
      setSelectedCampaign(campaign)

      saveToLocalStorage(STORAGE_KEYS.CAMPAIGN_ID, campaign.id)
      saveToLocalStorage(STORAGE_KEYS.BEARER_TOKEN, campaign.bearerToken)
      saveToLocalStorage(STORAGE_KEYS.OUTBOUND_ID, campaign.outboundId)
      setIsConfigured(true)

      await fetchCalls()
      toast({ title: "Campaign selected", description: campaign.campaignName })
    },
    [campaigns, fetchCalls, toast],
  )

  // Update credentials and save to localStorage
  const handleSubmitCredentials = useCallback(async () => {
    if (!canSubmit) {
      toast({
        title: "Error",
        description: "Please fill in both Auth ID and Token fields.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      // Test the credentials by making a test API call
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      const testResponse = await fetch(`${CALLS_API_BASE_URL}/Outbound/${token.trim()}/Calls`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authId.trim().replace("Bearer ", "")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skip: 0,
          limit: 1,
          sortProp: "startTime",
          isAscending: false,
          fromDate: getDefaultDateRange().from,
          toDate: getDefaultDateRange().to,
          tags: [],
          statuses: [],
          searchInput: "",
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!testResponse.ok) {
        let errorMessage = "Invalid credentials."
        switch (testResponse.status) {
          case 401:
            errorMessage = "Invalid bearer token. Please check your authentication credentials."
            break
          case 403:
            errorMessage = "Access denied. Your bearer token may not have the required permissions."
            break
          case 404:
            errorMessage = "Outbound ID not found. Please verify the outbound ID is correct."
            break
          default:
            errorMessage = `API error (${testResponse.status}). Please check your credentials.`
        }
        throw new Error(errorMessage)
      }

      // Save successful credentials to localStorage
      saveToLocalStorage(STORAGE_KEYS.BEARER_TOKEN, authId.trim())
      saveToLocalStorage(STORAGE_KEYS.OUTBOUND_ID, token.trim())

      setShowModal(false)
      setAuthId("")
      setToken("")
      setIsConfigured(true)
      toast({
        title: "Success",
        description: "Credentials saved successfully!",
      })

      // Fetch calls with new credentials
      fetchCalls()
    } catch (error) {
      console.error("Error testing credentials:", error)
      const errorMessage =
        error instanceof Error
          ? error.name === "AbortError"
            ? "Request timed out. Please try again."
            : error.message
          : "An unexpected error occurred."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, authId, token, toast, fetchCalls])

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: Partial<CallsFilters>) => {
      const updatedFilters = { ...filters, ...newFilters, skip: 0 } // Reset to first page
      setFilters(updatedFilters)
      fetchCalls(updatedFilters)
    },
    [filters, fetchCalls],
  )

  // Handle pagination
  const handlePageChange = useCallback(
    (page: number) => {
      const newSkip = (page - 1) * filters.limit
      const updatedFilters = { ...filters, skip: newSkip }
      setFilters(updatedFilters)
      fetchCalls(updatedFilters)
    },
    [filters, fetchCalls],
  )

  // Manual refresh (also refresh campaigns)
  const handleRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)

    if (user?.id) {
      await fetchUserData(user.id, false)
    }

    const email = userData?.email || user?.emailAddresses?.[0]?.emailAddress || ""
    if (email) {
      await fetchCampaigns(email) // refresh the campaigns too
    }

    await fetchCalls()
    setRefreshing(false)
    toast({
      title: "Refreshed",
      description: "Data has been refreshed.",
    })
  }, [refreshing, user?.id, userData?.email, user?.emailAddresses, fetchUserData, fetchCampaigns, fetchCalls, toast])

  // Open modal for editing credentials
  const handleEditCredentials = useCallback(() => {
    const savedBearerToken = getFromLocalStorage(STORAGE_KEYS.BEARER_TOKEN)
    const savedOutboundId = getFromLocalStorage(STORAGE_KEYS.OUTBOUND_ID)
    setAuthId(savedBearerToken || "")
    setToken(savedOutboundId || "")
    setShowModal(true)
  }, [])

  // Close modal and reset form
  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setAuthId("")
    setToken("")
  }, [])

  // Handle call selection
  const handleCallClick = useCallback(
    (call: CallData) => {
      setSelectedCall(call)
      setSidebarOpen(true)
      setActiveRightTab("transcript")
      setCallDetails(null) // Reset previous call details
      fetchCallDetails(call.id)
    },
    [fetchCallDetails],
  )

  // Close sidebar
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
    setSelectedCall(null)
    setCallDetails(null)
  }, [])

  // Clear stored credentials (also forget campaign via STORAGE_KEYS iteration)
  const clearStoredCredentials = useCallback(() => {
    clearCallsStorage()
    setCalls([])
    setTotalCalls(0)
    setIsConfigured(false)
    setSelectedCampaign(null)
    toast({
      title: "Cleared",
      description: "Stored credentials have been cleared.",
    })
  }, [toast])

  // Initial data fetch
  useEffect(() => {
    if (isLoaded && user?.id) {
      fetchUserData(user.id)
    }
  }, [isLoaded, user?.id, fetchUserData])

  // NEW: try to load campaigns once we know the user's email
  useEffect(() => {
    if (!isLoaded) return
    const email = userData?.email || user?.emailAddresses?.[0]?.emailAddress || ""
    if (email) fetchCampaigns(email)
  }, [isLoaded, userData?.email, user?.emailAddresses, fetchCampaigns])

  // Tweak the “credentials required” effect (avoid popping modal while campaigns load)
  useEffect(() => {
    if (!isLoaded) return
    if (isConfigured) {
      fetchCalls()
    } else if (!campaignsLoading && campaigns.length === 0) {
      setShowModal(true)
    }
  }, [isLoaded, isConfigured, campaignsLoading, campaigns.length, fetchCalls])

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-700">Loading Calls Dashboard</h3>
            <p className="text-sm text-slate-500">Please wait while we set up your calls...</p>
          </div>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center space-y-4 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <Phone className="w-8 h-8 text-red-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-800">Authentication Required</h2>
            <p className="text-slate-600">Please sign in to access your calls dashboard.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`flex h-screen bg-gray-50 ${sidebarOpen ? "overflow-hidden" : ""}`}>
        {/* Main Content */}
        <div className={`flex-1 flex flex-col ${sidebarOpen ? "lg:mr-[840px]" : ""} transition-all duration-300`}>
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Calls Dashboard
                </h1>
                {totalCalls > 0 && (
                  <Badge variant="secondary" className="text-xs sm:text-sm bg-blue-100 text-blue-800">
                    {totalCalls.toLocaleString()} total
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className="text-xs sm:text-sm bg-transparent transition-all duration-200 hover:shadow-md"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${refreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                {/* <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditCredentials}
                  className="text-xs sm:text-sm bg-transparent transition-all duration-200 hover:shadow-md"
                >
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{isConfigured ? "Edit Credentials" : "Add Credentials"}</span>
                  <span className="sm:hidden">Config</span>
                </Button> */}
                {isConfigured && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearStoredCredentials}
                    className="text-xs sm:text-sm bg-transparent transition-all duration-200 hover:shadow-md"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* User Status */}
          {loading ? (
            <div className="bg-white border-b border-gray-200 p-6 lg:p-8">
              <div className="flex items-center justify-center py-8 lg:py-12">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-700">Loading User Data</h3>
                    <p className="text-sm text-slate-500">Fetching your account information...</p>
                  </div>
                </div>
              </div>
            </div>
          ) : userData ? (
            <div className="bg-white border-b border-gray-200 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full ${isConfigured ? "bg-emerald-500" : "bg-amber-500"} shadow-lg`} />
                    <div
                      className={`absolute inset-0 w-3 h-3 rounded-full ${
                        isConfigured ? "bg-emerald-500" : "bg-amber-500"
                      } animate-ping opacity-20`}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-medium truncate">{userData.username}</span>
                  <span className="text-xs sm:text-sm text-gray-500 truncate hidden sm:inline">{userData.email}</span>
                </div>
                <div className="text-xs sm:text-sm">
                  <Badge
                    variant={isConfigured ? "default" : "secondary"}
                    className={`${
                      isConfigured
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : "bg-amber-100 text-amber-800 border-amber-200"
                    } px-3 py-1`}
                  >
                    {isConfigured ? "✓ Configured" : "⚠ Setup Required"}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div></div>
          )}

          {/* Campaign Selection (Calls page only) */}
          {campaignsLoading ? (
            <div className="bg-white border-b border-gray-200 p-3 sm:p-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Loading campaigns…</span>
              </div>
            </div>
          ) : campaigns.length > 0 ? (
            <div className="bg-white border-b border-gray-200 p-3 sm:p-4">
              <h3 className="text-sm font-semibold mb-3">Select Campaign</h3>
              <div className="max-w-lg">
                <Select value={selectedCampaign?.id || ""} onValueChange={handleCampaignChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id} className="whitespace-normal">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{campaign.campaignName}</span>
                          <span className="text-xs text-gray-500 break-all">ID: {campaign.outboundId}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {/* Filters */}
          {isConfigured && (
            <div className="bg-white border-b border-gray-200 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search calls..."
                    value={filters.searchInput}
                    onChange={(e) => handleFilterChange({ searchInput: e.target.value })}
                    className="w-full text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-2 sm:space-x-4">
                  <Select
                    value={filters.statuses.length > 0 ? filters.statuses[0].toString() : "all"}
                    onValueChange={(value) =>
                      handleFilterChange({ statuses: value === "all" ? [] : [Number.parseInt(value)] })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-32 lg:w-40 text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="4">Completed</SelectItem>
                      <SelectItem value="6">Failed</SelectItem>
                      <SelectItem value="3">In Progress</SelectItem>
                      <SelectItem value="100">Success</SelectItem>
                      <SelectItem value="150">Unreachable</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange({ limit: Number.parseInt(value) })}>
                    <SelectTrigger className="w-16 sm:w-20 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Calls Table */}
          <div className="flex-1 overflow-hidden">
            {isConfigured ? (
              callsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-700">Loading Calls</h3>
                      <p className="text-sm text-slate-500">Fetching your call data...</p>
                    </div>
                  </div>
                </div>
              ) : calls.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block h-full overflow-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">From</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">To</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Start Time</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Duration</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Conversation</th>
                          {/* NEW: Tags column */}
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tags</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {calls.map((call) => (
                          <tr
                            key={call.id}
                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleCallClick(call)}
                          >
                            <td className="py-3 px-4 text-sm">{call.from || "N/A"}</td>
                            <td className="py-3 px-4 text-sm">{call.to || "N/A"}</td>
                            <td className="py-3 px-4 text-sm">{formatDate(call.startTime)}</td>
                            <td className="py-3 px-4 text-sm">{formatDuration(call.duration)}</td>
                            <td className="py-3 px-4">
                              <Badge className={getStatusBadgeColor(call.status)}>{getStatusText(call.status)}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{getConversationStatusText(call.conversationStatus)}</Badge>
                            </td>
                            {/* Tags dots */}
                            <td className="py-3 px-4">
                              <TagDots tags={call.tags ?? []} />
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCallClick(call)
                                }}
                                className="transition-all duration-200 hover:shadow-md"
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden h-full overflow-auto p-3 sm:p-4 space-y-3">
                    {calls.map((call) => (
                      <div
                        key={call.id}
                        className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200"
                        onClick={() => handleCallClick(call)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                              {call.from?.slice(-2) || "??"}
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
                              {call.to?.slice(-2) || "??"}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCallClick(call)
                            }}
                            className="h-8 w-8 p-0 transition-all duration-200 hover:shadow-md"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">From → To</span>
                            <span className="text-sm font-medium">
                              {call.from || "N/A"} → {call.to || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Duration</span>
                            <span className="text-sm">{formatDuration(call.duration)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Start Time</span>
                            <span className="text-xs">{formatDate(call.startTime)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Status</span>
                            <Badge className={`${getStatusBadgeColor(call.status)} text-xs`}>{getStatusText(call.status)}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Conversation</span>
                            <Badge variant="outline" className="text-xs">
                              {getConversationStatusText(call.conversationStatus)}
                            </Badge>
                          </div>
                          {/* Mobile tags */}
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Tags</span>
                            <TagDots tags={call.tags ?? []} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-12 px-4">
                  <div className="text-center">
                    <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No calls found</h3>
                    <p className="text-gray-500 mb-4 text-sm sm:text-base">
                      {filters.searchInput || filters.statuses.length > 0 ? "Try adjusting your filters" : "No calls have been made yet"}
                    </p>
                    <Button onClick={() => fetchCalls()} size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center py-12 px-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Edit className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Required</h3>
                  <p className="text-gray-500 mb-4 text-sm sm:text-base">Please configure your API credentials to view calls</p>
                  <Button onClick={handleEditCredentials} size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    <Edit className="h-4 w-4 mr-2" />
                    Add Credentials
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          {isConfigured && totalCalls > 0 && (
            <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                  Showing {filters.skip + 1} to {Math.min(filters.skip + filters.limit, totalCalls)} of {totalCalls.toLocaleString()} calls
                </div>
                <div className="flex items-center space-x-2 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="text-xs sm:text-sm transition-all duration-200 hover:shadow-md"
                  >
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-1">Previous</span>
                  </Button>
                  <span className="text-xs sm:text-sm px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="text-xs sm:text-sm transition-all duration-200 hover:shadow-md"
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Sidebar */}
        {sidebarOpen && selectedCall && (
          <>
            {/* Mobile Overlay */}
            <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={closeSidebar} />
            {/* Sidebar */}
            <div className="fixed right-0 top-0 h-full w-full lg:w-[840px] bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-50">
              {/* Top bar with route chips & close */}
              <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3 overflow-hidden">
                  <div className="flex items-center flex-shrink-0">
                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                      {selectedCall.from?.slice(-2) || "??"}
                    </div>
                    <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />
                    <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                      {selectedCall.to?.slice(-2) || "??"}
                    </div>
                  </div>
                  <div className="truncate text-sm font-medium">
                    {selectedCall.from} → {selectedCall.to}
                  </div>
                  <Badge className={cn(getStatusBadgeColor(selectedCall.status), "truncate max-w-[160px]")}>
                    {getStatusText(selectedCall.status)}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={closeSidebar} className="ml-2 flex-shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content grid: left info & right transcript/event log */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-3 sm:p-4">
                {/* LEFT: Info */}
                <div className="space-y-4">
                  {/* Tags */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-slate-800">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {(callDetails?.tags ?? selectedCall?.tags ?? []).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="px-2 py-1 text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Summary Section */}
                  {callDetails?.summary && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-slate-800">Summary</h3>
                      <p className="text-sm text-gray-700 bg-gradient-to-r from-slate-50 to-slate-100 p-3 rounded-lg leading-relaxed border border-slate-200">
                        {callDetails.summary}
                      </p>
                    </div>
                  )}

                  {/* Call Details */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-slate-800">Call Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border rounded-lg overflow-hidden">
                      <div className="px-3 py-2 text-xs sm:text-sm bg-gray-50 border-b sm:border-b-0 sm:border-r">Lead Name</div>
                      <div className="px-3 py-2 text-xs sm:text-sm sm:col-span-2 border-b">{callDetails?.name || "—"}</div>

                      <div className="px-3 py-2 text-xs sm:text-sm bg-gray-50 sm:border-r">Duration</div>
                      <div className="px-3 py-2 text-xs sm:text-sm sm:col-span-2 border-t sm:border-t-0">
                        {callDetails ? formatDuration(callDetails.duration) : formatDuration(selectedCall.duration)}
                      </div>

                      <div className="px-3 py-2 text-xs sm:text-sm bg-gray-50 border-t sm:border-l-0 sm:border-r">Status</div>
                      <div className="px-3 py-2 text-xs sm:text-sm sm:col-span-2 border-t">
                        <Badge className={getStatusBadgeColor(callDetails?.status ?? selectedCall.status)}>
                          {getStatusText(callDetails?.status ?? selectedCall.status)}
                        </Badge>
                      </div>

                      <div className="px-3 py-2 text-xs sm:text-sm bg-gray-50 border-t sm:border-r">Sentiment</div>
                      <div className="px-3 py-2 text-xs sm:text-sm sm:col-span-2 border-t">
                        <span className={cn("font-medium", getSentimentColor(callDetails?.overallSentiment ?? 3))}>
                          {getSentimentText(callDetails?.overallSentiment ?? 3)}
                        </span>
                      </div>

                      <div className="px-3 py-2 text-xs sm:text-sm bg-gray-50 border-t sm:border-r">Start Time</div>
                      <div className="px-3 py-2 text-xs sm:text-sm sm:col-span-2 border-t">
                        {formatDate(callDetails?.startTime ?? selectedCall.startTime)}
                      </div>

                      <div className="px-3 py-2 text-xs sm:text-sm bg-gray-50 border-t sm:border-r">Conversation</div>
                      <div className="px-3 py-2 text-xs sm:text-sm sm:col-span-2 border-t">
                        <Badge variant="outline">
                          {getConversationStatusText(callDetails?.conversationStatus ?? selectedCall.conversationStatus)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Variables / Collected Info */}
                  {callDetails?.collectedInfo && callDetails.collectedInfo.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 text-slate-800">Variables</h3>
                      <div className="divide-y border rounded-lg">
                        {callDetails.collectedInfo.map((info) => (
                          <div key={info.id} className="grid grid-cols-1 sm:grid-cols-3">
                            <div className="px-3 py-2 text-xs sm:text-sm bg-gray-50">{info.name}</div>
                            <div className="px-3 py-2 text-xs sm:text-sm sm:col-span-2 break-words">{String(info.value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: Transcript / Event Log with top tabs */}
                <div className="">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setActiveRightTab("transcript")}
                      className={cn("text-xs sm:text-sm px-3 py-1.5 rounded-md border", activeRightTab === "transcript" ? "bg-white shadow-sm" : "bg-white/60")}
                    >
                      Transcript
                    </button>
                    <button
                      onClick={() => setActiveRightTab("events")}
                      className={cn("text-xs sm:text-sm px-3 py-1.5 rounded-md border", activeRightTab === "events" ? "bg-white shadow-sm" : "bg-white/60")}
                    >
                      Event Log
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Transcript */}
                    {activeRightTab === "transcript" && (
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 sm:p-4 max-h-[520px] overflow-y-auto border border-slate-200">
                        {callDetailsLoading && (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                          </div>
                        )}

                        {!callDetailsLoading && callDetails?.transcript && callDetails.transcript.length > 0 ? (
                          callDetails.transcript.map((message, index) => {
                            const isAI = message.role === 1
                            const isUser = message.role === 2
                            const isSystem = message.role === 3

                            let roleLabel = "Unknown"
                            let bubbleClasses = "px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm border text-slate-800 bg-white"

                            if (isAI) {
                              // role 1 => "User"
                              roleLabel = "User"
                              bubbleClasses = "px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm border border-blue-200 bg-blue-50 text-slate-800"
                            } else if (isUser) {
                              // role 2 => "Agent"
                              roleLabel = "Agent"
                              bubbleClasses = "px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm border border-slate-200 bg-slate-50 text-slate-800"
                            } else if (isSystem) {
                              roleLabel = "User"
                              bubbleClasses = "px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm border border-blue-200 bg-blue-50 text-blue-800"
                            }

                            return (
                              <div key={index} className="mb-3 sm:mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-slate-600">{roleLabel}</span>
                                </div>
                                <div className={bubbleClasses}>
                                  <p className="text-sm leading-relaxed break-words">{message.content}</p>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          !callDetailsLoading && <div className="text-sm text-gray-500">No transcript available.</div>
                        )}

                        {/* Conversation Stats */}
                        {!callDetailsLoading && callDetails?.transcript && callDetails.transcript.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                                <span className="text-gray-600">User: {callDetails.transcript.filter((m) => m.role === 1).length}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-500 to-teal-600"></div>
                                <span className="text-gray-600">Agent: {callDetails.transcript.filter((m) => m.role === 2).length}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-gradient-to-r from-purple-500 to-purple-600"></div>
                                <span className="text-gray-600">System: {callDetails.transcript.filter((m) => m.role === 3).length}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-gradient-to-r from-gray-400 to-gray-500"></div>
                                <span className="text-gray-600">Total: {callDetails.transcript.length}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Event Log placeholder */}
                    {activeRightTab === "events" && <div className="bg-white border rounded-lg p-4 text-sm text-gray-500">Event Log data is not available for this call.</div>}

                    {/* Recording */}
                    {callDetails?.recording && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 text-slate-800">Recording</h3>
                        <div className="space-y-2">
                          <audio controls className="w-full">
                            <source src={callDetails.recording} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-transparent text-sm transition-all duration-200 hover:shadow-md"
                            onClick={() => window.open(callDetails.recording!, "_blank")}
                          >
                            Download Recording
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Loading state when opening sidebar before details arrive */}
              {!callDetails && callDetailsLoading && (
                <div className="p-6">
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-4">
                      <div className="relative">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-700">Loading Call Details</h3>
                        <p className="text-xs text-slate-500">Fetching detailed information...</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Credentials Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-[500px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
            <DialogHeader className="space-y-4 pb-6 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    {isConfigured ? "Update API Credentials" : "Setup API Credentials"}
                  </DialogTitle>
                  <DialogDescription className="text-slate-600 mt-1">
                    {isConfigured
                      ? "Update your Bearer Token and Outbound ID below to continue accessing calls."
                      : "Please provide your Bearer Token and Outbound ID to access call data."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="py-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="authId" className="text-sm font-semibold text-slate-700 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-slate-500" />
                    Bearer Token
                  </Label>
                  <Input
                    id="authId"
                    value={authId}
                    onChange={(e) => setAuthId(e.target.value)}
                    placeholder="Enter your Bearer Token"
                    disabled={submitting}
                    className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                  />
                  <p className="text-xs text-slate-500">This is your Bearer Token for API authentication</p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="token" className="text-sm font-semibold text-slate-700 flex items-center">
                    <Edit className="w-4 h-4 mr-2 text-slate-500" />
                    Outbound ID
                  </Label>
                  <Input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter your Outbound ID"
                    disabled={submitting}
                    className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                  />
                  <p className="text-xs text-slate-500">This is your Outbound ID for accessing call data</p>
                </div>
              </div>
              {/* Help Section */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Phone className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800">Need Help Finding Your Credentials?</h4>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>
                          <strong>Bearer Token:</strong> Your authentication token for API access
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>
                          <strong>Outbound ID:</strong> Your unique identifier for accessing call data
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span>
                          <strong>Having Issues?</strong> Contact support for assistance with API access
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-6 border-t border-slate-100 gap-3">
              <Button
                variant="outline"
                onClick={handleCloseModal}
                disabled={submitting}
                className="w-full sm:w-auto text-sm bg-transparent hover:bg-slate-50 transition-all duration-200 hover:shadow-md px-6"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSubmitCredentials}
                disabled={!canSubmit}
                className="w-full sm:w-auto text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:shadow-lg px-6"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isConfigured ? "Updating..." : "Saving..."}
                  </>
                ) : isConfigured ? (
                  "Update Credentials"
                ) : (
                  "Save Credentials"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Toaster />
    </>
  )
}

export default CallsPage

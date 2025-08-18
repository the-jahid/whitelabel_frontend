"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect, useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  Phone,
  Users,
  BarChart3,
  Home,
  Clock,
  Activity,
  Heart,
  Calendar,
  Menu,
  DoorClosedIcon as CloseIcon,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts"
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
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

// Interfaces
interface CampaignData {
  id: string
  campaignName: string
  outboundId: string
  bearerToken: string
  userId: string
  createdAt: string
  updatedAt: string
}

interface AnalyticsData {
  callsStatusOverview: {
    totalCalls: number
    totalLeads: number
    needRetry: number
    wrongCountryCode: number
    needFollowUp: number
    voiceMailLeft: number
    successful: number
    unsuccessful: number
    wrongNumber: number
    completed: number
    unreachable: number
    error: number
  }
  callsSentimentOverview: {
    negative: number
    slightlyNegative: number
    neutral: number
    slightlyPositive: number
    positive: number
  }
  callsStatusTimeLine: Array<{
    totalCalls: number
    totalLeads: number
    needRetry: number
    wrongCountryCode: number
    needFollowUp: number
    voiceMailLeft: number
    successful: number
    unsuccessful: number
    wrongNumber: number
    completed: number
    unreachable: number
    error: number
    date: string
  }>
  callsAverageTimeLine: Array<{
    date: string
    averageCallDuration: number
  }>
  callsCostTimeLine: Array<{
    date: string
    totalPrice: number
    averageCostPerCall: number
  }>
  callsPickupRateTimeLine: Array<{
    date: string
    pickupRatePercentage: number
  }>
  callsSuccessRateTimeLine: Array<{
    date: string
    successRatePercentage: number
  }>
  callLabelCount: Array<{
    id: string
    name: string
    color: string
    count: number
  }>
  callEventsCounts: {
    takeMessageCount: number
    smsSentCount: number
    callTransferredCount: number
    calendarBookedCount: number
    emailSentCount: number
  }
  callsByHourDayOfWeeks: Array<{
    hourOfDay: number
    dayOfWeek: number
    count: number
  }>
}

// LocalStorage utilities
const STORAGE_KEYS = {
  BEARER_TOKEN: "analytics_bearer_token",
  OUTBOUND_ID: "analytics_outbound_id",
  CAMPAIGN_ID: "analytics_campaign_id",
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

const clearAnalyticsStorage = () => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    removeFromLocalStorage(key)
  })
}

// API Base URLs
const API_BASE_URL = "https://whitelabel-server.onrender.com"
const ANALYTICS_API_BASE_URL = "https://api.nlpearl.ai/v1"

// ✅ Custom pricing (YOUR rates)
const OUR_CALL_RATE_PER_MIN = 0.4 // $ per minute
const OUR_SMS_RATE = 0.16 // $ per SMS (not used in this chart)

// Helper function to get date range (last 30 days by default)
const getDefaultDateRange = () => {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

// Chart colors
const SENTIMENT_COLORS = {
  positive: "#22c55e",
  slightlyPositive: "#84cc16",
  neutral: "#6b7280",
  slightlyNegative: "#f59e0b",
  negative: "#ef4444",
}

// Sidebar navigation items
const sidebarItems = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "performance", label: "Performance", icon: Activity },
  { id: "sentiment", label: "Sentiment", icon: Heart },
  { id: "events", label: "Events", icon: Calendar },
]

// Main Component
const OverviewPage = () => {
  const { user, isLoaded } = useUser()
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<CampaignData[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange] = useState(getDefaultDateRange())
  const [activeSection, setActiveSection] = useState("overview")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Active-state + toggling state
  // null = unknown; true = ON; false = OFF
  const [isCampaignOn, setIsCampaignOn] = useState<boolean | null>(null)
  const [isToggling, setIsToggling] = useState(false)
  const [isCampaignChecking, setIsCampaignChecking] = useState(false)

  // ---- STATUS CHECK (required) ----
  // Use GET /Outbound/{id}, where status: 1 => ON, 2 => OFF
  const fetchOutboundActive = useCallback(
    async (outboundId: string, bearerToken: string) => {
      setIsCampaignChecking(true)
      try {
        const res = await fetch(`${ANALYTICS_API_BASE_URL}/Outbound/${outboundId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${bearerToken.replace("Bearer ", "")}`,
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) {
          let msg = `Failed to fetch status (${res.status})`
          if (res.status === 401) msg = "Invalid bearer token."
          if (res.status === 403) msg = "Access denied."
          if (res.status === 404) msg = "Outbound ID not found."
          throw new Error(msg)
        }

        const data = await res.json()
        const status: number | undefined = data?.status

        if (status === 1) {
          setIsCampaignOn(true)
          return true
        } else if (status === 2) {
          setIsCampaignOn(false)
          return false
        } else {
          setIsCampaignOn(null)
          toast({
            title: "Unknown status",
            description: `Received status=${String(status)}. Expected 1 (ON) or 2 (OFF).`,
            variant: "destructive",
          })
          return null
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unable to read campaign status."
        toast({ title: "Status check failed", description: msg, variant: "destructive" })
        setIsCampaignOn(null)
        return null
      } finally {
        setIsCampaignChecking(false)
      }
    },
    [toast],
  )

  // ---- TOGGLE (unchanged) ----
  const toggleOutboundActive = useCallback(
    async (outboundId: string, bearerToken: string, isActive: boolean) => {
      const response = await fetch(`${ANALYTICS_API_BASE_URL}/Outbound/${outboundId}/Active`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken.replace("Bearer ", "")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      })

      if (!response.ok) {
        let errorMessage = "Failed to toggle campaign."
        switch (response.status) {
          case 401:
            errorMessage = "Invalid bearer token."
            break
          case 403:
            errorMessage = "Access denied."
            break
          case 404:
            errorMessage = "Outbound ID not found."
            break
          case 400:
            errorMessage = "Invalid request body."
            break
          case 500:
            errorMessage = "Server error."
            break
          default:
            errorMessage = `API error (${response.status}).`
        }
        throw new Error(errorMessage)
      }
    },
    [],
  )

  const handleCampaign = useCallback(async () => {
    if (!selectedCampaign?.outboundId || !selectedCampaign?.bearerToken) {
      toast({
        title: "Select a campaign",
        description: "No campaign credentials available.",
        variant: "destructive",
      })
      return
    }
    if (isToggling || isCampaignChecking || isCampaignOn === null) return

    const next = !isCampaignOn
    setIsCampaignOn(next) // optimistic
    setIsToggling(true)

    try {
      await toggleOutboundActive(selectedCampaign.outboundId, selectedCampaign.bearerToken, next)
      toast({
        title: next ? "Campaign enabled" : "Campaign disabled",
        description: `Outbound ${selectedCampaign.outboundId} is now ${next ? "active" : "inactive"}.`,
      })
    } catch (err) {
      setIsCampaignOn(!next) // revert
      const msg = err instanceof Error ? err.message : "Unexpected error."
      toast({ title: "Toggle failed", description: msg, variant: "destructive" })
    } finally {
      setIsToggling(false)
    }
  }, [selectedCampaign, isCampaignOn, isToggling, isCampaignChecking, toggleOutboundActive, toast])

  // Memoized values
  const userEmail = useMemo(() => {
    return user?.emailAddresses?.[0]?.emailAddress || ""
  }, [user?.emailAddresses])

  const isConfigured = useMemo(() => {
    return campaigns.length > 0
  }, [campaigns.length])

  // 🔢 Recalculate cost timeline using YOUR call rate
  const ourCostTimeline = useMemo(() => {
    if (!analyticsData) return []

    const avgMap = new Map((analyticsData.callsAverageTimeLine || []).map((d) => [d.date, d.averageCallDuration]))
    const callMap = new Map((analyticsData.callsStatusTimeLine || []).map((d) => [d.date, d.totalCalls]))
    const dates = Array.from(new Set([...avgMap.keys(), ...callMap.keys()])).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    )

    return dates.map((date) => {
      const avgSec = avgMap.get(date) ?? 0
      const calls = callMap.get(date) ?? 0
      const avgMin = avgSec / 60
      const averageCostPerCall = +(avgMin * OUR_CALL_RATE_PER_MIN).toFixed(3)
      const totalPrice = +(calls * averageCostPerCall).toFixed(2)
      return { date, totalPrice, averageCostPerCall }
    })
  }, [analyticsData])

  // Fetch campaigns by email
  const fetchCampaigns = useCallback(
    async (email: string, showLoader = true) => {
      if (!email) return
      if (showLoader) setLoading(true)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        const response = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(email)}/userdata`, {
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache" },
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          if (response.status === 404) {
            setCampaigns([])
            setSelectedCampaign(null)
            toast({
              title: "No campaigns found",
              description: "No campaigns found for this email address.",
              variant: "destructive",
            })
            return []
          }
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: CampaignData[] = await response.json()
        const campaignsArray = Array.isArray(data) ? data : []
        setCampaigns(campaignsArray)

        if (campaignsArray.length > 0) {
          const savedCampaignId = getFromLocalStorage(STORAGE_KEYS.CAMPAIGN_ID)
          const existingCampaign = savedCampaignId ? campaignsArray.find((c) => c.id === savedCampaignId) : null
          const campaignToSelect = existingCampaign || campaignsArray[0]
          setSelectedCampaign(campaignToSelect)

          // Save + fetch analytics + fetch active state
          saveToLocalStorage(STORAGE_KEYS.CAMPAIGN_ID, campaignToSelect.id)
          saveToLocalStorage(STORAGE_KEYS.BEARER_TOKEN, campaignToSelect.bearerToken)
          saveToLocalStorage(STORAGE_KEYS.OUTBOUND_ID, campaignToSelect.outboundId)

          fetchAnalytics(campaignToSelect.outboundId, campaignToSelect.bearerToken)
          fetchOutboundActive(campaignToSelect.outboundId, campaignToSelect.bearerToken)
        } else {
          toast({ title: "No campaigns found", description: "No campaigns found for this email address." })
        }

        return campaignsArray
      } catch (error) {
        console.error("Error fetching campaigns:", error)
        const errorMessage =
          error instanceof Error
            ? error.name === "AbortError"
              ? "Request timed out. Please try again."
              : "Failed to fetch campaigns. Please try again."
            : "An unexpected error occurred."
        toast({ title: "Error", description: errorMessage, variant: "destructive" })
        setCampaigns([])
        setSelectedCampaign(null)
        return []
      } finally {
        if (showLoader) setLoading(false)
      }
    },
    [toast,  fetchOutboundActive],
  )

  // Fetch analytics data
  const fetchAnalytics = useCallback(
    async (outboundId: string, bearerToken: string, customDateRange?: typeof dateRange) => {
      if (!outboundId || !bearerToken) return
      setAnalyticsLoading(true)
      try {
        const range = customDateRange || dateRange
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)
        const response = await fetch(`${ANALYTICS_API_BASE_URL}/Outbound/${outboundId}/Analytics`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearerToken.replace("Bearer ", "")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: range.from,
            to: range.to,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (!response.ok) {
          let errorMessage = "Failed to fetch analytics data."
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
        const data: AnalyticsData = await response.json()
        setAnalyticsData(data)
        saveToLocalStorage(STORAGE_KEYS.BEARER_TOKEN, bearerToken)
        saveToLocalStorage(STORAGE_KEYS.OUTBOUND_ID, outboundId)
        if (selectedCampaign) {
          saveToLocalStorage(STORAGE_KEYS.CAMPAIGN_ID, selectedCampaign.id)
        }
        toast({ title: "Success", description: "Analytics data loaded successfully!" })
      } catch (error) {
        console.error("Error fetching analytics:", error)
        let errorMessage = "An unexpected error occurred."
        if (error instanceof Error) {
          if (error.name === "AbortError") errorMessage = "Analytics request timed out. Please try again."
          else errorMessage = error.message
        }
        toast({ title: "Analytics Error", description: errorMessage, variant: "destructive" })
        if (
          error instanceof Error &&
          (error.message.includes("Invalid bearer token") ||
            error.message.includes("Access denied") ||
            error.message.includes("Outbound ID not found"))
        ) {
          setAnalyticsData(null)
          clearAnalyticsStorage()
        }
      } finally {
        setAnalyticsLoading(false)
      }
    },
    [dateRange, toast, selectedCampaign],
  )

  // Handle campaign selection
  const handleCampaignChange = useCallback(
    (campaignId: string) => {
      const campaign = campaigns.find((c) => c.id === campaignId)
      if (campaign) {
        setSelectedCampaign(campaign)
        fetchAnalytics(campaign.outboundId, campaign.bearerToken)
        fetchOutboundActive(campaign.outboundId, campaign.bearerToken) // check status on switch
      }
    },
    [campaigns, fetchAnalytics, fetchOutboundActive],
  )

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    if (!userEmail || refreshing) return
    setRefreshing(true)
    const campaignsData = await fetchCampaigns(userEmail, false)
    if (campaignsData && campaignsData.length > 0 && selectedCampaign) {
      const updatedCampaign = campaignsData.find((c) => c.id === selectedCampaign.id)
      if (updatedCampaign) {
        await fetchAnalytics(updatedCampaign.outboundId, updatedCampaign.bearerToken)
        await fetchOutboundActive(updatedCampaign.outboundId, updatedCampaign.bearerToken)
      }
    }
    setRefreshing(false)
    toast({ title: "Refreshed", description: "Data has been refreshed." })
  }, [userEmail, refreshing, fetchCampaigns, selectedCampaign, fetchAnalytics, fetchOutboundActive, toast])

  // Initial data fetch
  useEffect(() => {
    if (isLoaded && userEmail) {
      fetchCampaigns(userEmail).then((campaignsData) => {
        if (!campaignsData || campaignsData.length === 0) {
          console.log("No campaigns found for user:", userEmail)
        }
      })
    }
  }, [isLoaded, userEmail, fetchCampaigns])

  // Load saved credentials from localStorage (and read status)
  useEffect(() => {
    if (isLoaded && campaigns.length > 0) {
      const savedCampaignId = getFromLocalStorage(STORAGE_KEYS.CAMPAIGN_ID)
      const savedBearerToken = getFromLocalStorage(STORAGE_KEYS.BEARER_TOKEN)
      const savedOutboundId = getFromLocalStorage(STORAGE_KEYS.OUTBOUND_ID)

      if (savedCampaignId && savedBearerToken && savedOutboundId) {
        const matchingCampaign = campaigns.find(
          (campaign) =>
            campaign.id === savedCampaignId &&
            campaign.bearerToken === savedBearerToken &&
            campaign.outboundId === savedOutboundId,
        )

        if (matchingCampaign && (!selectedCampaign || selectedCampaign.id !== matchingCampaign.id)) {
          setSelectedCampaign(matchingCampaign)
          fetchAnalytics(matchingCampaign.outboundId, matchingCampaign.bearerToken)
          fetchOutboundActive(matchingCampaign.outboundId, matchingCampaign.bearerToken) // read status on load
        }
      }
    }
  }, [isLoaded, campaigns, selectedCampaign, fetchAnalytics, fetchOutboundActive])

  const clearStoredCredentials = useCallback(() => {
    clearAnalyticsStorage()
    toast({ title: "Cleared", description: "Stored credentials have been cleared." })
  }, [toast])

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to continue.</p>
        </div>
      </div>
    )
  }

  // Render content based on active section
  const renderContent = () => {
    if (!analyticsData) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 mb-4">No analytics data available.</p>
            <Button
              onClick={() =>
                selectedCampaign && fetchAnalytics(selectedCampaign?.outboundId, selectedCampaign?.bearerToken)
              }
            >
              Load Analytics
            </Button>
          </CardContent>
        </Card>
      )
    }

    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium">Total Calls</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl lg:text-2xl font-bold">
                    {analyticsData.callsStatusOverview.totalCalls.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium">Total Leads</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl lg:text-2xl font-bold">
                    {analyticsData.callsStatusOverview.totalLeads.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium">Successful</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl lg:text-2xl font-bold text-green-600">
                    {analyticsData.callsStatusOverview.successful.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium">Completed</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl lg:text-2xl font-bold">
                    {analyticsData.callsStatusOverview.completed.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base lg:text-lg">Call Status Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analyticsData.callsStatusOverview).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-xs lg:text-sm capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className="font-medium text-sm lg:text-base">{value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base lg:text-lg">Event Counts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analyticsData.callEventsCounts).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-xs lg:text-sm capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className="font-medium text-sm lg:text-base">{value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case "timeline":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Calls Timeline</CardTitle>
                <CardDescription>Total calls and leads over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] lg:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.callsStatusTimeLine}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        fontSize={12}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value, name) => [value.toLocaleString(), name]}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalCalls"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Total Calls"
                        dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalLeads"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Total Leads"
                        dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Average Call Duration</CardTitle>
                <CardDescription>Average call duration over time (minutes)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] lg:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.callsAverageTimeLine}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        fontSize={12}
                      />
                      <YAxis fontSize={12} tickFormatter={(value) => `${Math.round(value / 60)}m`} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value) => [`${Math.round(Number(value) / 60)} minutes`, "Average Duration"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="averageCallDuration"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        name="Average Duration"
                        dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "performance":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pickup Rate</CardTitle>
                  <CardDescription>Call pickup rate over time (%)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] lg:h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.callsPickupRateTimeLine}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                          fontSize={12}
                        />
                        <YAxis fontSize={12} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                        <Tooltip
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value) => [`${value}%`, "Pickup Rate"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="pickupRatePercentage"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          name="Pickup Rate"
                          dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Success Rate</CardTitle>
                  <CardDescription>Call success rate over time (%)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] lg:h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.callsSuccessRateTimeLine}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                          fontSize={12}
                        />
                        <YAxis fontSize={12} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                        <Tooltip
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value) => [`${value}%`, "Success Rate"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="successRatePercentage"
                          stroke="#22c55e"
                          strokeWidth={2}
                          name="Success Rate"
                          dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
                <CardDescription>Total cost and average cost per call over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] lg:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ourCostTimeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        fontSize={12}
                      />
                      <YAxis yAxisId="left" fontSize={12} tickFormatter={(value: number) => `$${value.toFixed(2)}`} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        fontSize={12}
                        tickFormatter={(value: number) => `$${value.toFixed(3)}`}
                      />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: number, name: string, entry: any) => {
                          const isTotal = entry?.dataKey === "totalPrice"
                          return [isTotal ? `$${value.toFixed(2)}` : `$${value.toFixed(3)}`, name]
                        }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="totalPrice"
                        stroke="#dc2626"
                        strokeWidth={2}
                        name="Total Price"
                        dot={{ fill: "#dc2626", strokeWidth: 2, r: 4 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="averageCostPerCall"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        name="Avg Cost Per Call"
                        dot={{ fill: "#7c3aed", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "sentiment":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base lg:text-lg">Sentiment Analysis</CardTitle>
              <CardDescription className="text-sm">Distribution of call sentiments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-3 lg:space-y-4">
                  {Object.entries(analyticsData.callsSentimentOverview).map(([key, value]) => {
                    const total = Object.values(analyticsData.callsSentimentOverview).reduce((a, b) => a + b, 0)
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0"
                    return (
                      <div key={key} className="flex items-center justify-between p-2 lg:p-3 rounded-lg border">
                        <div className="flex items-center space-x-2 lg:space-x-3">
                          <div
                            className="w-3 h-3 lg:w-4 lg:h-4 rounded-full"
                            style={{
                              backgroundColor: SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS],
                            }}
                          />
                          <span className="text-sm lg:text-base capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-sm lg:text-base">{value.toLocaleString()}</span>
                          <span className="text-xs lg:text-sm text-gray-500 ml-1 lg:ml-2">({percentage}%)</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-center mt-4 lg:mt-0">
                  <div className="h-[250px] w-[250px] lg:h-[300px] lg:w-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(analyticsData.callsSentimentOverview)
                            .filter(([, value]) => value > 0)
                            .map(([key, value]) => ({
                              name: key.replace(/([A-Z])/g, " $1").trim(),
                              value,
                              fill: SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS],
                            }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {Object.entries(analyticsData.callsSentimentOverview).map(([key], index) => (
                            <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case "events":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Call Labels</CardTitle>
                <CardDescription>Distribution of call labels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.callLabelCount.map((label) => {
                    const total = analyticsData.callLabelCount.reduce((sum, l) => sum + l.count, 0)
                    const percentage = total > 0 ? ((label.count / total) * 100).toFixed(1) : "0"
                    return (
                      <div key={label.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: label.color }} />
                          <span>{label.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{label.count.toLocaleString()}</span>
                          <span className="text-sm text-gray-500 ml-2">({percentage}%)</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Calls by Hour</CardTitle>
                <CardDescription>Call distribution throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] lg:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.callsByHourDayOfWeeks}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hourOfDay" fontSize={12} tickFormatter={(value) => `${value}:00`} />
                      <YAxis fontSize={12} />
                      <Tooltip labelFormatter={(value) => `${value}:00`} formatter={(value) => [value.toLocaleString(), "Calls"]} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-4 lg:hidden">
            <h1 className="text-lg font-bold text-gray-900">Analytics</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Analytics Dashboard</h1>
          </div>

          {/* User Status */}
          {loading ? (
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Loading campaigns...</span>
              </div>
            </div>
          ) : (
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${isConfigured ? "bg-green-500" : "bg-orange-500"}`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{user.fullName || "User"}</h3>
                  <p className="text-xs text-gray-600 truncate">{userEmail}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-medium ${isConfigured ? "text-green-600" : "text-orange-600"}`}>
                  {isConfigured ? `✓ ${campaigns.length} Campaign(s)` : "⚠ No Campaigns"}
                </p>
                {selectedCampaign && (
                  <div className="text-xs text-gray-500 mt-1">
                    <p>Campaign: {selectedCampaign.campaignName}</p>
                    <p>Updated: {new Date(selectedCampaign.updatedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Campaign Selection */}
          {campaigns.length > 0 ? (
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold mb-3">Select Campaign</h3>
              <Select value={selectedCampaign?.id || ""} onValueChange={handleCampaignChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{campaign.campaignName}</span>
                        <span className="text-xs text-gray-500">ID: {campaign.outboundId}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-2">No campaigns available</p>
                <p className="text-xs text-gray-400">
                  {loading ? "Loading campaigns..." : "Please check your email configuration"}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id)
                      setSidebarOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      activeSection === item.id
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>

            {/* Outbound On/Off Toggle (status-aware via GET /Outbound/{id} -> status 1/2) */}
            <button
              type="button"
              onClick={handleCampaign}
              role="switch"
              aria-checked={!!isCampaignOn}
              aria-label="Toggle outbound campaign"
              disabled={isToggling || isCampaignChecking || !selectedCampaign || isCampaignOn === null}
              className={cn(
                "relative inline-flex h-7 w-24 items-center rounded-full bg-neutral-900 ring-1 ring-neutral-700 p-0.5 transition-colors focus:outline-none",
                (isToggling || isCampaignChecking || !selectedCampaign || isCampaignOn === null) &&
                  "opacity-60 cursor-not-allowed",
              )}
              title={
                isCampaignOn === null
                  ? "Status unknown"
                  : isCampaignOn
                  ? "Campaign is ON"
                  : "Campaign is OFF"
              }
            >
              {/* highlight slider */}
              <span
                className={`pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-4px)] rounded-full bg-neutral-600 transition-transform duration-200 ${
                  !!isCampaignOn ? "translate-x-0" : "translate-x-[calc(100%+4px)]"
                }`}
                aria-hidden="true"
              />
              {/* labels */}
              <span className={`z-10 flex-1 text-center text-sm ${!!isCampaignOn ? "text-white" : "text-neutral-400"}`}>
                {isCampaignChecking ? "…" : "On"}
              </span>
              <span className={`z-10 flex-1 text-center text-sm ${!isCampaignOn ? "text-white" : "text-neutral-400"}`}>
                {isCampaignChecking ? "…" : "Off"}
              </span>
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="w-full bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="destructive" size="sm" onClick={clearStoredCredentials} className="w-full bg-transparent">
              Clear Credentials
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h1>
            <div className="w-9" />
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto">
            <div className="p-4 lg:p-6">
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-sm lg:text-base">Loading analytics data...</span>
                </div>
              ) : (
                renderContent()
              )}
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  )
}

export default OverviewPage

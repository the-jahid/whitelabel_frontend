"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import {
  Phone,
  Plus,
  Upload,
  X as XIcon,
  Play,
  Pause,
  Clock,
  PhoneCall,
  Settings,
  AlertCircle,
  Download,
} from "lucide-react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"

/* ----------------- CSV helpers ----------------- */
const escapeCsv = (val: string | number | null | undefined) => {
  if (val === null || val === undefined) return ""
  const str = String(val)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

const downloadBlob = (content: string, filename: string, type = "text/csv;charset=utf-8;") => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
/* ----------------------------------------------- */

/* ---------------- Toast ---------------- */
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
    defaultVariants: { variant: "default" },
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
    <XIcon className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />)
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

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
      if (toastId) addToRemoveQueue(toastId)
      else state.toasts.forEach((toast) => addToRemoveQueue(toast.id))
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
    toast: { ...props, id, open: true, onOpenChange: (open) => { if (!open) dismiss() } },
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
          <div className="grid gap-1">{title && <ToastTitle>{title}</ToastTitle>}{description && <ToastDescription>{description}</ToastDescription>}</div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
})
Toaster.displayName = "Toaster"

/* -------- LocalStorage helpers -------- */
const STORAGE_KEYS = {
  BEARER_TOKEN: "analytics_bearer_token",
  OUTBOUND_ID: "analytics_outbound_id",
}

const saveToLocalStorage = (key: string, value: string) => {
  try {
    if (typeof window !== "undefined" && window.localStorage) localStorage.setItem(key, value)
  } catch {}
}
const getFromLocalStorage = (key: string): string | null => {
  try {
    if (typeof window !== "undefined" && window.localStorage) return localStorage.getItem(key)
  } catch {}
  return null
}
const removeFromLocalStorage = (key: string) => {
  try {
    if (typeof window !== "undefined" && window.localStorage) localStorage.removeItem(key)
  } catch {}
}
const clearLeadsStorage = () => {
  Object.values(STORAGE_KEYS).forEach((key) => removeFromLocalStorage(key))
}

/* --------------- APIs --------------- */
const API_BASE_URL = "https://api.nlpearl.ai/v1" // calls + status + toggle

/* --------------- Types --------------- */
type Lead = {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  status: "pending" | "called" | "failed"
  callId?: string
}
type BulkCallState = {
  inProgress: boolean
  currentIndex: number
  totalCalls: number
  timeframe: number
  paused: boolean
}
type CampaignCreds = { outboundId: string; bearerToken: string } | null

/* ============== Component ============== */
export default function LeadsPage() {
  const { toast } = useToast()

  // Leads state
  const [leads, setLeads] = useState<Lead[]>([])
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false)
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
  const [isBulkCallOpen, setIsBulkCallOpen] = useState(false)
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Campaign creds derived from localStorage
  const [campaignCreds, setCampaignCreds] = useState<CampaignCreds>(null)
  const isConfigured = !!campaignCreds

  // Campaign ON/OFF toggle state
  const [isCampaignOn, setIsCampaignOn] = useState<boolean | null>(null)
  const [isToggling, setIsToggling] = useState(false)
  const [isCampaignChecking, setIsCampaignChecking] = useState(false)

  // Credentials modal state
  const [bearerToken, setBearerToken] = useState("")
  const [outboundId, setOutboundId] = useState("")
  const [credentialsSubmitting, setCredentialsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "" })

  // Bulk import state
  const [bulkData, setBulkData] = useState("")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<string[][]>([])

  // Bulk call state
  const [bulkCallState, setBulkCallState] = useState<BulkCallState>({
    inProgress: false,
    currentIndex: 0,
    totalCalls: 0,
    timeframe: 5,
    paused: false,
  })

  // Refs for bulk calling
  const bulkCallQueueRef = useRef<Lead[]>([])
  const bulkCallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ======== Campaign Status Helpers (moved from Overview) ======== */
  const fetchOutboundActive = useCallback(
    async (outId: string, token: string) => {
      setIsCampaignChecking(true)
      try {
        const res = await fetch(`${API_BASE_URL}/Outbound/${outId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token.replace("Bearer ", "")}`,
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
        if (status === 1) setIsCampaignOn(true)
        else if (status === 2) setIsCampaignOn(false)
        else {
          setIsCampaignOn(null)
          toast({
            title: "Unknown status",
            description: `Received status=${String(status)}. Expected 1 (ON) or 2 (OFF).`,
            variant: "destructive",
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unable to read campaign status."
        toast({ title: "Status check failed", description: msg, variant: "destructive" })
        setIsCampaignOn(null)
      } finally {
        setIsCampaignChecking(false)
      }
    },
    [toast],
  )

  const toggleOutboundActive = useCallback(async (outId: string, token: string, isActive: boolean) => {
    const response = await fetch(`${API_BASE_URL}/Outbound/${outId}/Active`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.replace("Bearer ", "")}`,
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
  }, [])

  const handleCampaign = useCallback(async () => {
    if (!campaignCreds?.outboundId || !campaignCreds?.bearerToken) {
      toast({
        title: "Missing credentials",
        description: "Please configure your Bearer Token and Outbound ID first.",
        variant: "destructive",
      })
      return
    }
    if (isToggling || isCampaignChecking || isCampaignOn === null) return

    const next = !isCampaignOn
    setIsCampaignOn(next) // optimistic
    setIsToggling(true)
    try {
      await toggleOutboundActive(campaignCreds.outboundId, campaignCreds.bearerToken, next)
      toast({
        title: next ? "Campaign enabled" : "Campaign disabled",
        description: `Outbound ${campaignCreds.outboundId} is now ${next ? "active" : "inactive"}.`,
      })
    } catch (err) {
      setIsCampaignOn(!next) // revert
      const msg = err instanceof Error ? err.message : "Unexpected error."
      toast({ title: "Toggle failed", description: msg, variant: "destructive" })
    } finally {
      setIsToggling(false)
    }
  }, [campaignCreds, isCampaignOn, isToggling, isCampaignChecking, toggleOutboundActive, toast])

  /* ======== Load creds from localStorage ======== */
  useEffect(() => {
    const savedBearerToken = getFromLocalStorage(STORAGE_KEYS.BEARER_TOKEN)
    const savedOutboundId = getFromLocalStorage(STORAGE_KEYS.OUTBOUND_ID)
    if (savedBearerToken && savedOutboundId) {
      const creds = { bearerToken: savedBearerToken, outboundId: savedOutboundId }
      setCampaignCreds(creds)
      // Check current ON/OFF status
      fetchOutboundActive(savedOutboundId, savedBearerToken)
    } else {
      setIsCredentialsOpen(true)
    }
  }, [fetchOutboundActive])

  /* ======== Credentials Submit ======== */
  const handleCredentialsSubmit = async () => {
    if (!bearerToken.trim() || !outboundId.trim()) {
      toast({
        title: "Missing credentials",
        description: "Please provide both Bearer Token and Outbound ID.",
        variant: "destructive",
      })
      return
    }

    setCredentialsSubmitting(true)
    try {
      // Quick auth test by attempting a POST (will likely fail on number, that's ok)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      const testResponse = await fetch(`${API_BASE_URL}/Outbound/${outboundId.trim()}/Call`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken.trim().replace("Bearer ", "")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: "+1234567890",
          callData: { firstName: "Test", lastName: "User", email: "test@example.com" },
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (testResponse.status === 401 || testResponse.status === 403) {
        throw new Error("Invalid credentials. Please check your Bearer Token and Outbound ID.")
      }

      saveToLocalStorage(STORAGE_KEYS.BEARER_TOKEN, bearerToken.trim())
      saveToLocalStorage(STORAGE_KEYS.OUTBOUND_ID, outboundId.trim())
      const creds = { bearerToken: bearerToken.trim(), outboundId: outboundId.trim() }
      setCampaignCreds(creds)

      setIsCredentialsOpen(false)
      setBearerToken("")
      setOutboundId("")
      toast({ title: "Success", description: "Credentials saved successfully!" })

      // Read and show current status
      await fetchOutboundActive(creds.outboundId, creds.bearerToken)
    } catch (error) {
      const msg =
        error instanceof Error ? (error.name === "AbortError" ? "Request timed out. Please try again." : error.message) : "An unexpected error occurred."
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setCredentialsSubmitting(false)
    }
  }

 

  const clearStoredCredentials = () => {
    clearLeadsStorage()
    setCampaignCreds(null)
    setIsCampaignOn(null)
    toast({ title: "Cleared", description: "Stored credentials have been cleared." })
  }

  /* ======== Lead form handlers ======== */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }
  const handleBulkDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setBulkData(e.target.value)

  /* ======== CSV Upload ======== */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({ title: "Invalid file type", description: "Please upload a CSV file.", variant: "destructive" })
      return
    }

    setCsvFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.trim().split("\n")
      const preview = lines.slice(0, 5).map((line) => line.split(",").map((cell) => cell.trim().replace(/"/g, "")))
      setCsvPreview(preview)
    }
    reader.readAsText(file)
  }

  const handleCsvImport = () => {
    if (!csvFile) {
      toast({ title: "No file selected", description: "Please select a CSV file to import.", variant: "destructive" })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.trim().split("\n")
        if (lines.length < 2) {
          toast({ title: "Invalid CSV", description: "CSV must have at least a header and one row.", variant: "destructive" })
          return
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""))
        const firstNameIndex = headers.findIndex((h) => (h.includes("first") && h.includes("name")) || h === "firstname")
        const lastNameIndex = headers.findIndex((h) => (h.includes("last") && h.includes("name")) || h === "lastname")
        const nameIndex = headers.findIndex((h) => h === "name" && firstNameIndex === -1)
        const emailIndex = headers.findIndex((h) => h.includes("email"))
        const phoneIndex = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("number"))

        if ((firstNameIndex === -1 && nameIndex === -1) || phoneIndex === -1) {
          toast({ title: "Missing required columns", description: "CSV must contain name (or first/last) and phone.", variant: "destructive" })
          return
        }

        const newLeads: Lead[] = []
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(",").map((cell) => cell.trim().replace(/"/g, ""))
          if (row.length < headers.length) continue

          let firstName = ""
          let lastName = ""
          if (firstNameIndex !== -1 && lastNameIndex !== -1) {
            firstName = row[firstNameIndex] || ""
            lastName = row[lastNameIndex] || ""
          } else if (nameIndex !== -1) {
            const fullName = row[nameIndex].split(" ")
            firstName = fullName[0] || ""
            lastName = fullName.slice(1).join(" ") || ""
          }
          const email = emailIndex !== -1 ? row[emailIndex] || "" : ""
          const phoneNumber = row[phoneIndex] || ""

          if (firstName && phoneNumber) {
            newLeads.push({
              id: crypto.randomUUID(),
              firstName,
              lastName,
              email,
              phoneNumber,
              status: "pending",
            })
          }
        }

        if (newLeads.length === 0) {
          toast({ title: "No valid leads found", description: "Please check your CSV format and try again.", variant: "destructive" })
          return
        }

        setLeads((prev) => [...prev, ...newLeads])
        setCsvFile(null)
        setCsvPreview([])
        setIsBulkImportOpen(false)
        toast({ title: "CSV import successful", description: `${newLeads.length} leads have been imported from CSV.` })
      } catch {
        toast({ title: "Import failed", description: "Error processing your CSV file.", variant: "destructive" })
      }
    }
    reader.readAsText(csvFile)
  }

  /* ======== Manual add + bulk paste ======== */
  const resetForm = () => setFormData({ firstName: "", lastName: "", email: "", phoneNumber: "" })

  const handleAddLead = () => {
    if (!formData.firstName || !formData.lastName || !formData.phoneNumber) {
      toast({ title: "Missing information", description: "Please fill in all required fields.", variant: "destructive" })
      return
    }
    const newLead: Lead = { id: crypto.randomUUID(), ...formData, status: "pending" }
    setLeads((prev) => [...prev, newLead])
    resetForm()
    setIsAddLeadOpen(false)
    toast({ title: "Lead added", description: `${newLead.firstName} ${newLead.lastName} has been added.` })
  }

  const handleBulkImport = () => {
    try {
      const lines = bulkData.trim().split("\n")
      const startIndex =
        lines[0]?.toLowerCase().includes("first") ||
        lines[0]?.toLowerCase().includes("name") ||
        lines[0]?.toLowerCase().includes("email")
          ? 1
          : 0

      const newLeads: Lead[] = []
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        const [firstName, lastName, email, phoneNumber] = line.split(",").map((item) => item.trim())
        if (firstName && lastName && phoneNumber) {
          newLeads.push({
            id: crypto.randomUUID(),
            firstName,
            lastName,
            email: email || "",
            phoneNumber,
            status: "pending",
          })
        }
      }

      if (newLeads.length === 0) {
        toast({ title: "No valid leads found", description: "Please check your data format and try again.", variant: "destructive" })
        return
      }

      setLeads((prev) => [...prev, ...newLeads])
      setBulkData("")
      setIsBulkImportOpen(false)
      toast({ title: "Bulk import successful", description: `${newLeads.length} leads have been imported.` })
    } catch {
      toast({ title: "Import failed", description: "Error processing your data.", variant: "destructive" })
    }
  }

  /* ======== Make a call ======== */
  const makeCall = async (lead: Lead) => {
    const savedBearerToken = getFromLocalStorage(STORAGE_KEYS.BEARER_TOKEN)
    const savedOutboundId = getFromLocalStorage(STORAGE_KEYS.OUTBOUND_ID)

    if (!savedBearerToken || !savedOutboundId) {
      toast({ title: "Credentials required", description: "Please configure your API credentials first.", variant: "destructive" })
      setIsCredentialsOpen(true)
      return false
    }

    setIsLoading(true)
    try {
      const createResponse = await fetch(`${API_BASE_URL}/Outbound/${savedOutboundId}/Call`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${savedBearerToken.replace("Bearer ", "")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: lead.phoneNumber,
          callData: { firstName: lead.firstName, lastName: lead.lastName, email: lead.email },
        }),
      })

      if (!createResponse.ok) {
        let errorMessage = "Failed to initiate call."
        switch (createResponse.status) {
          case 401:
            errorMessage = "Invalid bearer token. Please check your credentials."
            clearLeadsStorage()
            setIsCredentialsOpen(true)
            break
          case 403:
            errorMessage = "Access denied. Please check your permissions."
            break
          case 404:
            errorMessage = "Outbound ID not found. Please verify your configuration."
            clearLeadsStorage()
            setIsCredentialsOpen(true)
            break
          default:
            errorMessage = `API error: ${createResponse.status}`
        }
        throw new Error(errorMessage)
      }

      const createData = await createResponse.json()
      if (!createData.id) throw new Error("No request ID received from API")

      const requestId = createData.id

      const callInfo = {
        id: requestId,
        requestId,
        from: createData.from || "Unknown",
        to: createData.to || lead.phoneNumber,
        leadName: `${lead.firstName} ${lead.lastName}`,
        startTime: new Date().toISOString(),
        status: "In Progress",
        conversationStatus: "In Call Queue",
        queuePosition: createData.queuePosition || 0,
      }
      const existingCalls = JSON.parse(localStorage.getItem("outboundCalls") || "[]")
      existingCalls.push(callInfo)
      localStorage.setItem("outboundCalls", JSON.stringify(existingCalls))

      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: "called", callId: requestId } : l)))
      toast({ title: "Call initiated", description: `Call to ${lead.firstName} ${lead.lastName} started. Request ID: ${requestId}` })
      return true
    } catch (error) {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: "failed" } : l)))
      toast({
        title: "Call failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /* ======== Bulk Call Flow ======== */
  const toggleLeadSelection = (id: string) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads(new Set())
    } else {
      const pendingLeadIds = leads.filter((l) => l.status === "pending").map((l) => l.id)
      setSelectedLeads(new Set(pendingLeadIds))
    }
    setSelectAll((s) => !s)
  }

  const startBulkCall = () => {
    if (!isConfigured) {
      toast({ title: "Credentials required", description: "Please configure your API credentials first.", variant: "destructive" })
      setIsCredentialsOpen(true)
      return
    }
    if (selectedLeads.size === 0) {
      toast({ title: "No leads selected", description: "Please select at least one lead to call.", variant: "destructive" })
      return
    }
    const selected = leads.filter((l) => selectedLeads.has(l.id) && l.status === "pending")
    if (selected.length === 0) {
      toast({ title: "No valid leads", description: "All selected leads have already been called.", variant: "destructive" })
      return
    }
    setBulkCallState((prev) => ({ ...prev, inProgress: true, currentIndex: 0, totalCalls: selected.length, paused: false }))
    bulkCallQueueRef.current = [...selected]
    processBulkCallQueue()
    setIsBulkCallOpen(false)
    toast({
      title: "Bulk call started",
      description: `Starting ${selected.length} calls with ${bulkCallState.timeframe}s between calls.`,
    })
  }

  const processBulkCallQueue = async () => {
    if (bulkCallQueueRef.current.length === 0 || bulkCallState.paused) return
    const lead = bulkCallQueueRef.current.shift()
    if (!lead) return
    await makeCall(lead)
    setBulkCallState((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }))

    if (bulkCallQueueRef.current.length > 0 && !bulkCallState.paused) {
      bulkCallTimerRef.current = setTimeout(processBulkCallQueue, bulkCallState.timeframe * 1000)
    } else {
      if (bulkCallQueueRef.current.length === 0) {
        setBulkCallState((prev) => ({ ...prev, inProgress: false }))
        toast({ title: "Bulk call completed", description: `Completed all ${bulkCallState.totalCalls} calls.` })
      }
    }
  }

  const pauseBulkCall = () => {
    setBulkCallState((prev) => ({ ...prev, paused: true }))
    if (bulkCallTimerRef.current) clearTimeout(bulkCallTimerRef.current)
    toast({ title: "Bulk call paused", description: `Paused after ${bulkCallState.currentIndex} of ${bulkCallState.totalCalls}.` })
  }
  const resumeBulkCall = () => {
    setBulkCallState((prev) => ({ ...prev, paused: false }))
    processBulkCallQueue()
    toast({ title: "Bulk call resumed", description: `Resuming with ${bulkCallQueueRef.current.length} calls remaining.` })
  }
  const cancelBulkCall = () => {
    setBulkCallState((prev) => ({ ...prev, inProgress: false, currentIndex: 0, totalCalls: 0, paused: false }))
    bulkCallQueueRef.current = []
    if (bulkCallTimerRef.current) clearTimeout(bulkCallTimerRef.current)
    toast({ title: "Bulk call cancelled", description: "The bulk call operation has been cancelled." })
  }

  /* ======== CSV & Excel downloads ======== */
  const downloadCsvTemplate = () => {
    const headers = ["firstName", "lastName", "email", "phoneNumber"].join(",")
    const rows = [
      ["John", "Doe", "john@example.com", "+1234567890"],
      ["Jane", "Smith", "jane@example.com", "+0987654321"],
    ]
      .map((r) => r.map(escapeCsv).join(","))
      .join("\n")
    const csv = `${headers}\n${rows}\n`
    downloadBlob(csv, "leads-template.csv")
  }

  const downloadExcelTemplate = () => {
    const headers = ["firstName", "lastName", "email", "phoneNumber"]
    const data = [
      headers,
      ["John", "Doe", "john@example.com", "+1234567890"],
      ["Jane", "Smith", "jane@example.com", "+0987654321"],
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(data)
    // Set nice column widths
    ws["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws, "Leads Template")
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "leads-template.xlsx"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const exportLeadsCsv = () => {
    if (leads.length === 0) {
      toast({ title: "No leads to export", description: "Add or import some leads first.", variant: "destructive" })
      return
    }
    const headers = ["firstName", "lastName", "email", "phoneNumber", "status"].join(",")
    const rows = leads
      .map((l) => [l.firstName, l.lastName, l.email || "", l.phoneNumber || "", l.status].map(escapeCsv).join(","))
      .join("\n")
    const csv = `${headers}\n${rows}\n`
    const date = new Date().toISOString().split("T")[0]
    downloadBlob(csv, `leads-${date}.csv`)
  }

  /* ======== Cleanup timer ======== */
  useEffect(() => {
    return () => {
      if (bulkCallTimerRef.current) clearTimeout(bulkCallTimerRef.current)
    }
  }, [])

  /* ======== UI ======== */
  return (
    <div className="container mx-auto py-8">
      <Toaster />
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Outbound Calling System</h1>
            <p className="text-muted-foreground mt-2">Manage your leads and make outbound calls</p>
          </div>

          <div className="flex items-center space-x-2">
            
            {isConfigured && (
              <Button variant="destructive" size="sm" onClick={clearStoredCredentials}>
                <XIcon className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}

            {/* Segmented toggle - wired to campaignCreds */}
            <button
              type="button"
              onClick={handleCampaign}
              role="switch"
              aria-checked={!!isCampaignOn}
              aria-label="Toggle outbound campaign"
              disabled={isToggling || isCampaignChecking || !campaignCreds || isCampaignOn === null}
              title={
                isCampaignOn === null ? "Status unknown"
                  : isCampaignOn ? "Campaign is ON"
                  : "Campaign is OFF"
              }
              className={cn(
                "relative inline-flex h-8 w-full sm:w-36 select-none items-center my-1 rounded-full",
                "bg-neutral-100 border border-neutral-200 shadow-sm p-1",
                "transition-colors focus:outline-none focus:ring-2 focus:ring-black/5",
                (isToggling || isCampaignChecking || !campaignCreds || isCampaignOn === null) && "opacity-60 cursor-not-allowed",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-200 shadow",
                  isCampaignOn === null ? "bg-neutral-400/80" : isCampaignOn ? "bg-green-500" : "bg-red-500",
                  isCampaignOn ? "translate-x-0" : "translate-x-[calc(100%+4px)]",
                  "z-0",
                )}
              />
              <div className="relative z-10 grid w-full grid-cols-2 text-xs sm:text-sm font-medium">
                <span className={cn("text-center transition-colors", isCampaignOn ? "text-white" : "text-neutral-600")}>
                  {isCampaignChecking ? "…" : "On"}
                </span>
                <span className={cn("text-center transition-colors", !isCampaignOn ? "text-white" : "text-neutral-600")}>
                  {isCampaignChecking ? "…" : "Off"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {!isConfigured && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
              <p className="text-amber-800 font-medium">API credentials required</p>
            </div>
            <p className="text-amber-700 text-sm mt-1">
              Please configure your Bearer Token and Outbound ID to start making calls.
            </p>
          </div>
        )}
      </header>

      <div className="flex justify-between items-center mb-6">
        <div className="space-x-2">
          <Button onClick={() => setIsAddLeadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Lead
          </Button>
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Bulk Import
          </Button>
          <Button variant="outline" onClick={exportLeadsCsv} disabled={leads.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsBulkCallOpen(true)}
            disabled={selectedLeads.size === 0 || bulkCallState.inProgress || !isConfigured}
          >
            <PhoneCall className="mr-2 h-4 w-4" /> Bulk Call ({selectedLeads.size})
          </Button>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {leads.length} leads • {leads.filter((l) => l.status === "called").length} called
          </p>
        </div>
      </div>

      {/* Bulk progress */}
      {bulkCallState.inProgress && (
        <div className="mb-6 p-4 border rounded-lg bg-slate-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Bulk Call in Progress</h3>
            <div className="space-x-2">
              {bulkCallState.paused ? (
                <Button size="sm" variant="outline" onClick={resumeBulkCall}>
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={pauseBulkCall}>
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={cancelBulkCall}>
                <XIcon className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
          <Progress value={(bulkCallState.currentIndex / bulkCallState.totalCalls) * 100} className="h-2 mb-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {bulkCallState.currentIndex} of {bulkCallState.totalCalls} calls completed
            </span>
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {bulkCallState.timeframe} seconds between calls
            </span>
          </div>
        </div>
      )}

      {/* Leads table */}
      {leads.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox checked={selectAll} onCheckedChange={toggleSelectAll} aria-label="Select all leads" />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={() => toggleLeadSelection(lead.id)}
                      disabled={lead.status !== "pending" || bulkCallState.inProgress}
                      aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                    />
                  </TableCell>
                  <TableCell>{lead.firstName} {lead.lastName}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.phoneNumber}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        lead.status === "called"
                          ? "bg-green-100 text-green-800"
                          : lead.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800",
                      )}
                    >
                      {lead.status === "called" ? "Called" : lead.status === "failed" ? "Failed" : "Pending"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => makeCall(lead)}
                              disabled={isLoading || lead.status === "called" || bulkCallState.inProgress || !isConfigured}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Call this lead</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => {
                              setLeads((prev) => prev.filter((l) => l.id !== lead.id))
                              setSelectedLeads((prev) => {
                                const n = new Set(prev); n.delete(lead.id); return n
                              })
                              toast({ title: "Lead removed", description: "The lead has been removed from your list." })
                            }}>
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Remove lead</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No leads added yet. Add your first lead to get started.</p>
          <Button className="mt-4" onClick={() => setIsAddLeadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Lead
          </Button>
        </div>
      )}

      {/* Credentials Modal */}
      <Dialog open={isCredentialsOpen} onOpenChange={setIsCredentialsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isConfigured ? "Update API Credentials" : "Setup API Credentials"}</DialogTitle>
            <DialogDescription>
              {isConfigured
                ? "Update your Bearer Token and Outbound ID below to continue making calls."
                : "Please provide your Bearer Token and Outbound ID to start making calls."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bearerToken">Bearer Token *</Label>
              <Input
                id="bearerToken"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="Enter your Bearer Token"
                disabled={credentialsSubmitting}
                required
              />
              <p className="text-xs text-muted-foreground">This is your Bearer Token for API authentication</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="outboundId">Outbound ID *</Label>
              <Input
                id="outboundId"
                value={outboundId}
                onChange={(e) => setOutboundId(e.target.value)}
                placeholder="Enter your Outbound ID"
                disabled={credentialsSubmitting}
                required
              />
              <p className="text-xs text-muted-foreground">This is your Outbound ID for making calls</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-md">
              <h4 className="font-medium text-blue-800 flex items-center">
                <Settings className="h-4 w-4 mr-2" /> Need Help?
              </h4>
              <p className="text-sm text-blue-700 mt-1">Contact support if you need assistance finding your API credentials.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCredentialsOpen(false)} disabled={credentialsSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCredentialsSubmit} disabled={!bearerToken.trim() || !outboundId.trim() || credentialsSubmitting}>
              {credentialsSubmitting ? "Testing..." : isConfigured ? "Update Credentials" : "Save Credentials"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lead Modal */}
      <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Enter the lead&apos;s information to add them to your calling list.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="John" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Doe" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="john.doe@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} placeholder="+1234567890" required />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddLeadOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLead}>Add Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
    <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
  <DialogContent
    className="
      w-[calc(100vw-2rem)] sm:max-w-[600px]
      max-h-[85vh] overflow-y-auto
      p-4 sm:p-6
    "
  >
    <DialogHeader>
      <DialogTitle>Bulk Import Leads</DialogTitle>
      <DialogDescription>
        Paste your lead data in CSV format: firstName,lastName,email,phoneNumber
      </DialogDescription>
    </DialogHeader>

    <div className="grid gap-4 py-2 sm:py-4">
      <Tabs defaultValue="paste">
        {/* Tabs become 1 column on small screens */}
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2">
          <TabsTrigger value="paste">Paste Data</TabsTrigger>
          <TabsTrigger value="upload">Upload CSV</TabsTrigger>
          <TabsTrigger value="format">Format Guide</TabsTrigger>
        </TabsList>

        {/* Paste */}
        <TabsContent value="paste" className="space-y-3 sm:space-y-4">
          <Textarea
            placeholder="John,Doe,john@example.com,+1234567890"
            className="min-h-[160px] sm:min-h-[200px]"
            value={bulkData}
            onChange={handleBulkDataChange}
          />
          <p className="text-xs sm:text-sm text-muted-foreground">
            Each line should contain one lead in the format:
            {" "}firstName,lastName,email,phoneNumber
          </p>
        </TabsContent>

        {/* Upload */}
        <TabsContent value="upload" className="space-y-3 sm:space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6">
            <div className="text-center">
              <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
              <div className="mt-3 sm:mt-4">
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Upload CSV file
                  </span>
                  <span className="mt-1 block text-xs sm:text-sm text-gray-500">
                    Select a CSV file with name, email, and phone columns
                  </span>
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-4 bg-transparent w-full sm:w-auto"
                onClick={() => document.getElementById("csv-upload")?.click()}
              >
                Choose File
              </Button>
            </div>
          </div>

          {csvFile && (
            <div className="space-y-2">
              <p className="text-sm font-medium break-all">
                Selected file: {csvFile.name}
              </p>

              {csvPreview.length > 0 && (
                <div className="border rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Preview (first 5 rows):
                  </p>

                  {/* Make the table horizontally scrollable on mobile */}
                  <div className="overflow-x-auto -mx-1 sm:mx-0">
                    <table className="min-w-[520px] w-full text-xs sm:text-sm">
                      <tbody>
                        {csvPreview.map((row, index) => (
                          <tr
                            key={index}
                            className={index === 0 ? "font-medium bg-muted" : ""}
                          >
                            {row.map((cell, cellIndex) => (
                              <td
                                key={cellIndex}
                                className="border px-2 py-1 truncate max-w-[120px]"
                                title={cell}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Format guide */}
        <TabsContent value="format">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Paste Data Format:</h4>
              <p className="text-sm mb-2">
                Your data should be in CSV format with the following columns:
              </p>
              <pre className="bg-muted p-3 sm:p-4 rounded-md text-xs overflow-x-auto">
{`firstName,lastName,email,phoneNumber
John,Doe,john@example.com,+1234567890
Jane,Smith,jane@example.com,+0987654321`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">CSV File Format:</h4>
              <p className="text-sm mb-2">
                Your CSV file can have any of these column combinations:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• <code>firstName, lastName, email, phone</code></li>
                <li>• <code>first name, last name, email, phone number</code></li>
                <li>• <code>name, email, mobile</code></li>
              </ul>
            </div>

            <div className="bg-amber-50 p-3 rounded-md">
              <h4 className="font-medium text-amber-800 flex items-center">
                <Clock className="h-4 w-4 mr-2" /> Important Notes
              </h4>
              <ul className="text-sm space-y-1 mt-2 text-amber-700">
                <li>• Calls will be made sequentially with the specified delay</li>
                <li>• You can pause or cancel the bulk call process at any time</li>
                <li>• Each call will update the lead status automatically</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>

    {/* Footer: stack on mobile, row on larger screens */}
    <DialogFooter className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <Button
        variant="outline"
        onClick={() => setIsBulkImportOpen(false)}
        className="w-full sm:w-auto"
      >
        Cancel
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={downloadCsvTemplate}
        className="w-full sm:w-auto"
      >
        <Download className="mr-2 h-4 w-4" />
        CSV Template
      </Button>

      {/* NEW: Excel template stays responsive too */}
      <Button
        type="button"
        variant="secondary"
        onClick={downloadExcelTemplate}
        className="w-full sm:w-auto"
      >
        <Download className="mr-2 h-4 w-4" />
         Excel Template
      </Button>

      <Button
        onClick={bulkData ? handleBulkImport : handleCsvImport}
        className="w-full sm:w-auto"
      >
        {csvFile ? "Import from CSV" : "Import Leads"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


      {/* Bulk Call Modal */}
      <Dialog open={isBulkCallOpen} onOpenChange={setIsBulkCallOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bulk Call Settings</DialogTitle>
            <DialogDescription>Configure settings for calling multiple leads in sequence</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Selected Leads</h3>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm"><strong>{selectedLeads.size}</strong> leads selected for bulk calling</p>
                  <p className="text-xs text-muted-foreground mt-1">Only leads with &quot;Pending&quot; status will be called</p>
                </div>
              </div>
              <div className="space-y-3">
                <Label>Time Between Calls (seconds)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[bulkCallState.timeframe]}
                    min={3}
                    max={30}
                    step={1}
                    onValueChange={(value) => setBulkCallState((prev) => ({ ...prev, timeframe: value[0] }))}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium">{bulkCallState.timeframe}s</span>
                </div>
                <p className="text-xs text-muted-foreground">Recommended: 5–10 seconds between calls</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-md">
                <h4 className="font-medium text-amber-800 flex items-center">
                  <Clock className="h-4 w-4 mr-2" /> Important Notes
                </h4>
                <ul className="text-sm space-y-1 mt-2 text-amber-700">
                  <li>• Calls will be made sequentially with the specified delay</li>
                  <li>• You can pause or cancel the bulk call process at any time</li>
                  <li>• Each call will update the lead status automatically</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkCallOpen(false)}>Cancel</Button>
            <Button onClick={startBulkCall} disabled={!isConfigured}>Start Bulk Call</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

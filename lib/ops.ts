import { createAlertThrottle, resolveAlertCooldownMs } from "./alert-throttle"
import { logStructured, serializeError, type LogContext } from "./observability"
import { sendOperationalAlert, type OperationalAlert } from "./notify"

export interface OperationFailure {
  event: string
  component: string
  action?: string
  error: unknown
  context?: LogContext
  severity?: OperationalAlert["severity"]
  fingerprint?: string
  /** Set to false for failures that should be logged but not paged. */
  alert?: boolean
}

const throttle = createAlertThrottle(resolveAlertCooldownMs(process.env.OPS_ALERT_COOLDOWN_SECONDS))

/**
 * Log a failed operation and (unless suppressed) dispatch an alert through the
 * notification center. Alert delivery failures are logged and swallowed so a
 * failing notifier can never turn a recoverable request error into a crash.
 */
export async function reportOperationFailure(failure: OperationFailure): Promise<void> {
  const serialized = serializeError(failure.error)

  logStructured("error", {
    event: failure.event,
    component: failure.component,
    action: failure.action,
    outcome: "failure",
    message: serialized.message,
    context: failure.context,
    error: failure.error,
  })

  if (failure.alert === false) return

  const fingerprint = failure.fingerprint
    || `${failure.event}:${failure.component}:${failure.action || "default"}`

  if (!throttle.shouldSend(fingerprint)) {
    logStructured("info", {
      event: "ops.alert_suppressed",
      component: "ops",
      outcome: "skipped",
      context: { fingerprint, alertEvent: failure.event },
    })
    return
  }

  await sendOperationalAlert({
    fingerprint,
    event: failure.event,
    severity: failure.severity || "error",
    title: `${failure.event}${failure.action ? ` (${failure.action})` : ""}`,
    message: serialized.message,
    occurredAt: new Date().toISOString(),
    context: failure.context,
  })
}

/** Test / maintenance helper. */
export function resetOpsAlertThrottle(): void {
  throttle.reset()
}

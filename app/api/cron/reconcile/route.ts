export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { runContentReconciliation } from "@/lib/reconcile-runner"
import { summarizeContentDrift } from "@/lib/reconcile"
import { logStructured } from "@/lib/observability"
import { reportOperationFailure } from "@/lib/ops"

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authorization = request.headers.get("authorization")
  if (authorization === `Bearer ${secret}`) return true

  return request.nextUrl.searchParams.get("token") === secret
}

async function run(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "cron is disabled", code: "cron_secret_missing" },
      { status: 503 },
    )
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const report = await runContentReconciliation()

    logStructured(report.ok ? "info" : "warn", {
      event: report.ok ? "content.reconcile_ok" : "content.reconcile_drift",
      component: "api.cron.reconcile",
      outcome: report.ok ? "success" : "failure",
      context: {
        checkedAt: report.checkedAt,
        posts: report.posts,
        repositoryFiles: report.repositoryFiles,
        counts: report.counts,
      },
    })

    if (!report.ok) {
      await reportOperationFailure({
        event: "content.reconcile_drift",
        component: "api.cron.reconcile",
        action: "reconcile",
        error: new Error(`Content drift detected: ${summarizeContentDrift(report.drift)}`),
        context: {
          checkedAt: report.checkedAt,
          posts: report.posts,
          repositoryFiles: report.repositoryFiles,
          counts: report.counts,
        },
        severity: "warning",
        fingerprint: "content.reconcile_drift",
      })
    }

    return NextResponse.json(report)
  } catch (error) {
    await reportOperationFailure({
      event: "content.reconcile_failed",
      component: "api.cron.reconcile",
      action: "reconcile",
      error,
      severity: "error",
      fingerprint: "content.reconcile_failed",
    })
    return NextResponse.json(
      { error: "reconciliation failed", code: "reconcile_failed" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return run(request)
}

export async function POST(request: NextRequest) {
  return run(request)
}

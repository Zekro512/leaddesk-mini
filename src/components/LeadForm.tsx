"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  BUDGET_RANGES,
  BUDGET_RANGE_LABELS,
  createLeadSchema,
  type CreateLeadFormValues,
} from "@/lib/validation/lead";

/** Shape of a 400 response from POST /api/leads. */
type ApiErrorBody = {
  error?: string;
  fieldErrors?: Partial<Record<keyof CreateLeadFormValues, string[]>>;
};

const MESSAGE_MAX = 2000;

export function LeadForm() {
  // Success is tracked outside react-hook-form because it should survive the
  // form reset that follows a successful submit.
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadFormValues>({
    // The exact schema the API route re-runs server-side — one definition,
    // two enforcement points.
    resolver: zodResolver(createLeadSchema),
    // Validate on blur so the form doesn't shout at someone mid-keystroke,
    // then re-validate on change once a field is already in an error state.
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      // Empty string renders the "Select a range" placeholder; it fails the
      // enum check, which is exactly the desired "you must pick one" error.
      budgetRange: "" as CreateLeadFormValues["budgetRange"],
      message: "",
    },
  });

  const messageLength = watch("message")?.length ?? 0;

  async function onSubmit(values: CreateLeadFormValues) {
    setSubmitted(false);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        reset();
        setSubmitted(true);
        return;
      }

      const body = (await response.json().catch(() => ({}))) as ApiErrorBody;

      // Map server-side field errors back onto the matching inputs, so a rule
      // that only the server can enforce still lands next to the right field.
      if (body.fieldErrors) {
        for (const [field, messages] of Object.entries(body.fieldErrors)) {
          if (messages?.length) {
            setError(field as keyof CreateLeadFormValues, {
              type: "server",
              message: messages[0],
            });
          }
        }
      }

      setError("root", {
        type: "server",
        message:
          body.error ?? "We couldn't send your message. Please try again.",
      });
    } catch {
      // Network failure / offline — fetch rejects before any response exists.
      setError("root", {
        type: "network",
        message:
          "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600">
          <svg
            className="h-6 w-6 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-emerald-900">
          Thanks — we&rsquo;ve got your details
        </h3>
        <p className="mt-2 text-sm text-emerald-800">
          Your enquiry is in the queue. Someone from the team will get back to
          you within one business day.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 text-sm font-semibold text-emerald-900 underline underline-offset-4 hover:text-emerald-700"
        >
          Submit another enquiry
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
      aria-busy={isSubmitting}
    >
      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-800"
        >
          Full name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
          className={inputClass(Boolean(errors.name))}
        />
        <FieldError id="name-error" message={errors.name?.message} />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-800"
        >
          Work email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="ada@company.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
          className={inputClass(Boolean(errors.email))}
        />
        <FieldError id="email-error" message={errors.email?.message} />
      </div>

      {/* Budget range */}
      <div>
        <label
          htmlFor="budgetRange"
          className="block text-sm font-medium text-slate-800"
        >
          Budget range
        </label>
        <select
          id="budgetRange"
          aria-invalid={Boolean(errors.budgetRange)}
          aria-describedby={
            errors.budgetRange ? "budgetRange-error" : undefined
          }
          {...register("budgetRange")}
          className={`${inputClass(Boolean(errors.budgetRange))} bg-white`}
        >
          <option value="">Select a range…</option>
          {BUDGET_RANGES.map((value) => (
            <option key={value} value={value}>
              {BUDGET_RANGE_LABELS[value]}
            </option>
          ))}
        </select>
        <FieldError
          id="budgetRange-error"
          message={errors.budgetRange?.message}
        />
      </div>

      {/* Message */}
      <div>
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="message"
            className="block text-sm font-medium text-slate-800"
          >
            What do you need help with?
          </label>
          <span
            className={`text-xs tabular-nums ${
              messageLength > MESSAGE_MAX ? "text-red-600" : "text-slate-400"
            }`}
          >
            {messageLength}/{MESSAGE_MAX}
          </span>
        </div>
        <textarea
          id="message"
          rows={5}
          placeholder="A couple of sentences about the project, timeline and what success looks like."
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
          {...register("message")}
          className={`${inputClass(Boolean(errors.message))} resize-y`}
        />
        <FieldError id="message-error" message={errors.message?.message} />
      </div>

      {/* Form-level (network / server) error */}
      {errors.root && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errors.root.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && <Spinner />}
        {isSubmitting ? "Sending…" : "Request a callback"}
      </button>

      <p className="text-center text-xs text-slate-500">
        No spam. We use your details only to reply to this enquiry.
      </p>
    </form>
  );
}

/** Shared input styling, with a red variant when the field is invalid. */
function inputClass(hasError: boolean) {
  return [
    "mt-1.5 block w-full rounded-xl border px-4 py-2.5 text-sm text-slate-900",
    "placeholder:text-slate-400 transition",
    hasError
      ? "border-red-400 bg-red-50/40"
      : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-red-600">
      {message}
    </p>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
      />
    </svg>
  );
}

"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import PhotoUploader from "@/components/PhotoUploader";
import { LANGUAGE_OPTIONS } from "@/lib/labels";
import { updateProfileAction, type ProfileState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Хадгалж байна…" : "Хадгалах"}
    </button>
  );
}

export default function ProfileForm({
  initial,
}: {
  initial: {
    firstName: string;
    lastName: string;
    phone: string | null;
    photoUrl: string | null;
    languages: string[];
  };
}) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfileAction, undefined);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">Зураг</label>
        <PhotoUploader name="photoUrl" initialUrl={initial.photoUrl} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Овог *</label>
          <input
            name="lastName"
            defaultValue={initial.lastName}
            required
            className="input"
          />
          {fe.lastName && <div className="text-[11px] text-white/70 mt-1">{fe.lastName}</div>}
        </div>
        <div>
          <label className="label">Нэр *</label>
          <input
            name="firstName"
            defaultValue={initial.firstName}
            required
            className="input"
          />
          {fe.firstName && <div className="text-[11px] text-white/70 mt-1">{fe.firstName}</div>}
        </div>
      </div>

      <div>
        <label className="label">Утас</label>
        <input
          name="phone"
          defaultValue={initial.phone ?? ""}
          placeholder="99112233"
          className="input"
        />
      </div>

      <div>
        <label className="label">Эзэмшсэн хэл</label>
        <div className="flex flex-wrap gap-2 pt-1">
          {LANGUAGE_OPTIONS.map((l) => (
            <label
              key={l.code}
              className="flex items-center gap-2 px-3 py-1.5 border border-white/12 rounded-md text-[12px] text-white/70 cursor-pointer hover:border-white/35 hover:text-white has-[:checked]:bg-white has-[:checked]:text-black has-[:checked]:border-white transition"
            >
              <input
                type="checkbox"
                name="languages"
                value={l.code}
                defaultChecked={initial.languages.includes(l.code)}
                className="accent-white"
              />
              {l.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {state?.ok && (
          <div className="text-[12px] text-white/80">✓ Хадгаллаа</div>
        )}
        {state?.error && (
          <div className="text-[12px] text-white/70 border border-white/20 rounded-md px-3 py-1.5">
            {state.error}
          </div>
        )}
        <div className="ml-auto">
          <Submit />
        </div>
      </div>
    </form>
  );
}

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SERVICE_ROLE_KEY);

if (!enabled) {
  console.warn(
    "RLS tests skipped: set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to run them."
  );
}

const run = Math.random().toString(36).slice(2, 10);
const PASSWORD = `Rls-${run}-Pass!1`;

type TestUser = { id: string; email: string };

describe.skipIf(!enabled)("RLS policies", () => {
  let admin: SupabaseClient;
  let coordinator: TestUser;
  let caregiver: TestUser;
  let viewer: TestUser;
  let outsider: TestUser;
  let extra: TestUser;
  let circleId: string;
  let recipientId: string;
  const createdUserIds: string[] = [];

  async function makeUser(label: string): Promise<TestUser> {
    const email = `rls-${label}-${run}@example.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw error ?? new Error(`Could not create user ${label}`);
    }
    createdUserIds.push(data.user.id);
    return { id: data.user.id, email };
  }

  async function signedIn(user: TestUser): Promise<SupabaseClient> {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error } = await client.auth.signInWithPassword({
      email: user.email,
      password: PASSWORD,
    });
    if (error) throw error;
    return client;
  }

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    coordinator = await makeUser("coord");
    caregiver = await makeUser("cg");
    viewer = await makeUser("view");
    outsider = await makeUser("out");
    extra = await makeUser("extra");

    const { data: circle, error: circleError } = await admin
      .from("care_circles")
      .insert({ name: `RLS test ${run}`, created_by: coordinator.id })
      .select("id")
      .single();
    if (circleError) throw circleError;
    circleId = circle.id;

    const { error: memberError } = await admin.from("care_circle_members").insert([
      { circle_id: circleId, user_id: coordinator.id, role: "coordinator" },
      { circle_id: circleId, user_id: caregiver.id, role: "caregiver" },
      { circle_id: circleId, user_id: viewer.id, role: "viewer" },
    ]);
    if (memberError) throw memberError;

    const { data: recipient, error: recipientError } = await admin
      .from("care_recipients")
      .insert({ circle_id: circleId, full_name: `RLS Recipient ${run}`, created_by: coordinator.id })
      .select("id")
      .single();
    if (recipientError) throw recipientError;
    recipientId = recipient.id;

    const { error: apptError } = await admin.from("appointments").insert({
      circle_id: circleId,
      recipient_id: recipientId,
      purpose: "RLS seed appointment",
    });
    if (apptError) throw apptError;
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      try {
        await admin.auth.admin.deleteUser(id);
      } catch {
        // ignore cleanup errors
      }
    }
  });

  it("viewer cannot insert an appointment", async () => {
    const client = await signedIn(viewer);
    const { error } = await client.from("appointments").insert({
      circle_id: circleId,
      recipient_id: recipientId,
      purpose: "Viewer attempt",
    });
    expect(error).not.toBeNull();
  });

  it("viewer cannot insert a task", async () => {
    const client = await signedIn(viewer);
    const { error } = await client.from("tasks").insert({
      circle_id: circleId,
      title: "Viewer attempt",
      status: "todo",
    });
    expect(error).not.toBeNull();
  });

  let caregiverTaskId: string;

  it("caregiver can insert a task and the row exists", async () => {
    const client = await signedIn(caregiver);
    const { data, error } = await client
      .from("tasks")
      .insert({
        circle_id: circleId,
        title: `Caregiver task ${run}`,
        status: "todo",
        created_by: caregiver.id,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    caregiverTaskId = data!.id;

    const { data: rows } = await client
      .from("tasks")
      .select("id")
      .eq("id", caregiverTaskId);
    expect(rows).toHaveLength(1);
  });

  it("non-member sees zero appointments from another circle", async () => {
    const client = await signedIn(outsider);
    const { data, error } = await client
      .from("appointments")
      .select("id")
      .eq("circle_id", circleId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("caregiver cannot insert a circle member", async () => {
    const client = await signedIn(caregiver);
    const { error } = await client.from("care_circle_members").insert({
      circle_id: circleId,
      user_id: outsider.id,
      role: "viewer",
    });
    expect(error).not.toBeNull();
  });

  it("coordinator can insert a circle member", async () => {
    const client = await signedIn(coordinator);
    const { error } = await client.from("care_circle_members").insert({
      circle_id: circleId,
      user_id: extra.id,
      role: "viewer",
    });
    expect(error).toBeNull();
  });

  it("caregiver task update is written to activity_events for the coordinator", async () => {
    const caregiverClient = await signedIn(caregiver);
    const { error: updateError } = await caregiverClient
      .from("tasks")
      .update({ title: `Edited by caregiver ${run}` })
      .eq("id", caregiverTaskId);
    expect(updateError).toBeNull();

    const coordinatorClient = await signedIn(coordinator);
    const { data, error } = await coordinatorClient
      .from("activity_events")
      .select("id")
      .eq("entity_id", caregiverTaskId)
      .eq("entity_type", "tasks");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });

  describe("Phase 3 records access", () => {
    const BUCKET = "care-documents";
    const today = new Date().toISOString().slice(0, 10);
    let standardId: string;
    let restrictedId: string;
    let standardPath: string;
    let restrictedPath: string;
    let prescriptionId: string;

    async function seedReport(
      id: string,
      path: string,
      title: string,
      visibility: "standard" | "restricted"
    ) {
      const { error: rowError } = await admin.from("reports").insert({
        id,
        circle_id: circleId,
        recipient_id: recipientId,
        title,
        report_date: today,
        source: "rls test",
        visibility,
        storage_path: path,
        mime_type: "application/pdf",
        created_by: coordinator.id,
      });
      if (rowError) throw rowError;

      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(path, new Blob(["synthetic test document"], { type: "application/pdf" }), {
          contentType: "application/pdf",
        });
      if (uploadError) throw uploadError;
    }

    beforeAll(async () => {
      standardId = randomUUID();
      restrictedId = randomUUID();
      standardPath = `${circleId}/${standardId}/standard-${run}.pdf`;
      restrictedPath = `${circleId}/${restrictedId}/restricted-${run}.pdf`;

      await seedReport(standardId, standardPath, `RLS standard ${run}`, "standard");
      await seedReport(restrictedId, restrictedPath, `RLS restricted ${run}`, "restricted");
    });

    afterAll(async () => {
      try {
        await admin.storage.from(BUCKET).remove([standardPath, restrictedPath]);
      } catch {
        // ignore cleanup errors
      }
      try {
        await admin.from("reports").delete().in("id", [standardId, restrictedId]);
      } catch {
        // ignore cleanup errors
      }
    });

    it("viewer can read a standard report", async () => {
      const client = await signedIn(viewer);
      const { data, error } = await client.from("reports").select("id").eq("id", standardId);
      expect(error, "viewer read of standard report should not error").toBeNull();
      expect(data, "viewer should see the standard report").toHaveLength(1);
    });

    it("viewer cannot read a restricted report", async () => {
      const client = await signedIn(viewer);
      const { data, error } = await client.from("reports").select("id").eq("id", restrictedId);
      expect(error, "viewer read of restricted report should not error").toBeNull();
      expect(data, "viewer must not see the restricted report").toHaveLength(0);
    });

    it("caregiver can read a restricted report", async () => {
      const client = await signedIn(caregiver);
      const { data, error } = await client.from("reports").select("id").eq("id", restrictedId);
      expect(error, "caregiver read of restricted report should not error").toBeNull();
      expect(data, "caregiver should see the restricted report").toHaveLength(1);
    });

    it("viewer cannot insert a report", async () => {
      const client = await signedIn(viewer);
      const { error } = await client.from("reports").insert({
        circle_id: circleId,
        recipient_id: recipientId,
        title: `Viewer attempt ${run}`,
        report_date: today,
        source: "rls test",
        visibility: "standard",
        storage_path: `${circleId}/${randomUUID()}/viewer-attempt-${run}.pdf`,
        mime_type: "application/pdf",
        created_by: viewer.id,
      });
      expect(error, "viewer insert into reports must be rejected").not.toBeNull();
    });

    it("viewer cannot create a signed link for a restricted document", async () => {
      const client = await signedIn(viewer);
      const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(restrictedPath, 60);
      expect(
        error !== null || !data?.signedUrl,
        "viewer must not obtain a signed link for a restricted document"
      ).toBe(true);
    });

    it("viewer can create a signed link for a standard document", async () => {
      const client = await signedIn(viewer);
      const { data, error } = await client.storage.from(BUCKET).createSignedUrl(standardPath, 60);
      expect(error, "viewer signed link for standard document should not error").toBeNull();
      expect(typeof data?.signedUrl, "signedUrl should be a string").toBe("string");
    });

    it("caregiver can create a signed link for a restricted document", async () => {
      const client = await signedIn(caregiver);
      const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(restrictedPath, 60);
      expect(error, "caregiver signed link for restricted document should not error").toBeNull();
      expect(typeof data?.signedUrl, "signedUrl should be a string").toBe("string");
    });

    it("prescription dose and schedule text are stored exactly as written", async () => {
      const dose = "1 tablet, as written: twice daily, morning and night";
      const schedule = "Every 12 hours (sample)";
      const client = await signedIn(caregiver);

      const { data: inserted, error: insertError } = await client
        .from("prescriptions")
        .insert({
          circle_id: circleId,
          recipient_id: recipientId,
          medication_name: `Sample Medicine Y ${run}`,
          dose_text: dose,
          schedule_text: schedule,
        })
        .select("id")
        .single();
      expect(insertError, "caregiver prescription insert should not error").toBeNull();
      prescriptionId = inserted!.id;

      const { data: row, error: readError } = await client
        .from("prescriptions")
        .select("dose_text, schedule_text")
        .eq("id", prescriptionId)
        .single();
      expect(readError, "caregiver read-back of prescription should not error").toBeNull();
      expect(row!.dose_text, "dose_text must match exactly").toBe(dose);
      expect(row!.schedule_text, "schedule_text must match exactly").toBe(schedule);

      await admin.from("prescriptions").delete().eq("id", prescriptionId);
    });

    it("viewer cannot insert a prescription", async () => {
      const client = await signedIn(viewer);
      const { error } = await client.from("prescriptions").insert({
        circle_id: circleId,
        recipient_id: recipientId,
        medication_name: "Sample Medicine Z",
      });
      expect(error, "viewer insert into prescriptions must be rejected").not.toBeNull();
    });
  });

  describe("tasks and handoff access", () => {
    let sampleTaskId: string;
    let handoffReportId: string;

    beforeAll(async () => {
      const { data: task, error: taskError } = await admin
        .from("tasks")
        .insert({
          circle_id: circleId,
          title: "Sample task A",
          status: "todo",
          created_by: coordinator.id,
          owner_id: caregiver.id,
        })
        .select("id")
        .single();
      if (taskError) throw taskError;
      sampleTaskId = task.id;

      handoffReportId = randomUUID();
      const { error: reportError } = await admin.from("reports").insert({
        id: handoffReportId,
        circle_id: circleId,
        recipient_id: recipientId,
        title: `RLS handoff restricted ${run}`,
        report_date: new Date().toISOString().slice(0, 10),
        source: "rls test",
        visibility: "restricted",
        storage_path: `${circleId}/${handoffReportId}/handoff-restricted-${run}.pdf`,
        mime_type: "application/pdf",
        created_by: coordinator.id,
      });
      if (reportError) throw reportError;
    });

    afterAll(async () => {
      try {
        await admin.from("tasks").delete().eq("id", sampleTaskId);
      } catch {
        // ignore cleanup errors
      }
      try {
        await admin.from("reports").delete().eq("id", handoffReportId);
      } catch {
        // ignore cleanup errors
      }
    });

    it("viewer can read tasks in the circle", async () => {
      const client = await signedIn(viewer);
      const { data, error } = await client.from("tasks").select("id").eq("circle_id", circleId);
      expect(error, "viewer read of tasks should not error").toBeNull();
      expect(data, "viewer should see at least one task in the circle").not.toBeNull();
      expect(data!.length, "viewer should see at least one task").toBeGreaterThanOrEqual(1);
    });

    it("viewer cannot insert a task", async () => {
      const client = await signedIn(viewer);
      const { error } = await client.from("tasks").insert({
        circle_id: circleId,
        title: "Sample task V",
        created_by: viewer.id,
      });
      expect(error, "viewer insert into tasks must be rejected").not.toBeNull();
    });

    it("viewer cannot update a task status", async () => {
      const client = await signedIn(viewer);
      const { data, error } = await client
        .from("tasks")
        .update({ status: "done" })
        .eq("id", sampleTaskId)
        .select("id");
      const rowsChanged = error ? 0 : (data ?? []).length;
      expect(rowsChanged, "viewer update of task status must change no rows").toBe(0);

      const { data: row, error: readError } = await admin
        .from("tasks")
        .select("status")
        .eq("id", sampleTaskId)
        .single();
      expect(readError, "service read-back of task should not error").toBeNull();
      expect(row!.status, "task status must still be 'todo'").toBe("todo");
    });

    it("caregiver can insert a task", async () => {
      const client = await signedIn(caregiver);
      const { data, error } = await client
        .from("tasks")
        .insert({
          circle_id: circleId,
          title: "Sample task C",
          created_by: caregiver.id,
        })
        .select("id")
        .single();
      expect(error, "caregiver insert into tasks should not error").toBeNull();

      const { error: cleanupError } = await admin.from("tasks").delete().eq("id", data!.id);
      expect(cleanupError, "cleanup of caregiver task should not error").toBeNull();
    });

    it("caregiver cannot assign an owner who is not a circle member", async () => {
      const client = await signedIn(caregiver);
      const { error } = await client.from("tasks").insert({
        circle_id: circleId,
        title: `Unassigned owner ${run}`,
        created_by: caregiver.id,
        owner_id: randomUUID(),
      });
      expect(error, "owner_id outside the circle must be rejected").not.toBeNull();
    });

    it("a non-member sees no tasks", async () => {
      const client = await signedIn(outsider);
      const { data, error } = await client.from("tasks").select("id").eq("circle_id", circleId);
      expect(error, "non-member read of tasks should not error").toBeNull();
      expect(data, "non-member must see zero tasks").toEqual([]);
    });

    it("handoff query does not read reports for viewers", async () => {
      const client = await signedIn(viewer);
      const { data, error } = await client
        .from("reports")
        .select("id")
        .eq("circle_id", circleId)
        .eq("id", handoffReportId);
      expect(error, "viewer handoff query on reports should not error").toBeNull();
      expect(data, "viewer must get zero rows for the restricted report").toHaveLength(0);
    });
  });

  describe.skipIf(!enabled)("privacy fixes (migration 0006)", () => {
    const BUCKET = "care-documents";
    let privacyRestrictedId: string;
    let privacyStandardId: string;
    let privacyRestrictedPath: string;
    let privacyStandardPath: string;

    beforeAll(async () => {
      privacyRestrictedId = randomUUID();
      privacyStandardId = randomUUID();
      privacyRestrictedPath = `${circleId}/${privacyRestrictedId}/privacy-restricted-${run}.pdf`;
      privacyStandardPath = `${circleId}/${privacyStandardId}/privacy-standard-${run}.pdf`;

      const today = new Date().toISOString().slice(0, 10);
      const { error: rowError } = await admin.from("reports").insert([
        {
          id: privacyRestrictedId,
          circle_id: circleId,
          recipient_id: recipientId,
          title: `Privacy restricted ${run}`,
          report_date: today,
          source: "rls test",
          visibility: "restricted",
          storage_path: privacyRestrictedPath,
          mime_type: "application/pdf",
          created_by: coordinator.id,
        },
        {
          id: privacyStandardId,
          circle_id: circleId,
          recipient_id: recipientId,
          title: `Privacy standard ${run}`,
          report_date: today,
          source: "rls test",
          visibility: "standard",
          storage_path: privacyStandardPath,
          mime_type: "application/pdf",
          created_by: coordinator.id,
        },
      ]);
      if (rowError) throw rowError;

      for (const path of [privacyRestrictedPath, privacyStandardPath]) {
        const { error: uploadError } = await admin.storage
          .from(BUCKET)
          .upload(path, new Blob(["synthetic test document"], { type: "application/pdf" }), {
            contentType: "application/pdf",
          });
        if (uploadError) throw uploadError;
      }
    });

    afterAll(async () => {
      try {
        await admin.storage
          .from(BUCKET)
          .remove([privacyRestrictedPath, privacyStandardPath]);
      } catch {
        // ignore cleanup errors
      }
      try {
        await admin.from("reports").delete().in("id", [privacyRestrictedId, privacyStandardId]);
      } catch {
        // ignore cleanup errors
      }
    });

    it("viewer cannot change a report visibility", async () => {
      const client = await signedIn(viewer);
      await client
        .from("reports")
        .update({ visibility: "standard" })
        .eq("id", privacyRestrictedId);

      const { data: row, error: readError } = await admin
        .from("reports")
        .select("visibility")
        .eq("id", privacyRestrictedId)
        .single();
      expect(readError, "service read-back of report should not error").toBeNull();
      expect(row!.visibility, "report visibility must still be 'restricted'").toBe("restricted");
    });

    it("caregiver cannot change a report visibility", async () => {
      const client = await signedIn(caregiver);
      const { error } = await client
        .from("reports")
        .update({ visibility: "standard" })
        .eq("id", privacyRestrictedId);
      expect(error, "caregiver visibility change must be rejected by the trigger").not.toBeNull();

      const { data: row, error: readError } = await admin
        .from("reports")
        .select("visibility")
        .eq("id", privacyRestrictedId)
        .single();
      expect(readError, "service read-back of report should not error").toBeNull();
      expect(row!.visibility, "report visibility must still be 'restricted'").toBe("restricted");
    });

    it("viewer cannot get a signed link for a restricted file", async () => {
      const client = await signedIn(viewer);
      const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(privacyRestrictedPath, 60);
      expect(
        error !== null || !data?.signedUrl,
        "viewer must not obtain a signed link for a restricted file"
      ).toBe(true);
    });
  });


});

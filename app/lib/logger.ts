import { createClient } from "@supabase/supabase-js";

type LogLevel = "info" | "warn" | "error";
type Fields = Record<string, unknown>;

function persistError(msg: string, fields?: Fields) {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) return;
	const db = createClient(url, key);
	db.from("error_logs")
		.insert({ msg, fields: fields ?? null })
		.then(({ error }) => {
			if (error) console.error(JSON.stringify({ level: "error", msg: "failed to persist error log", detail: error.message }));
		});
}

function emit(level: LogLevel, msg: string, fields?: Fields) {
	const entry = { level, msg, ts: new Date().toISOString(), ...fields };
	if (level === "error") {
		console.error(JSON.stringify(entry));
		persistError(msg, fields);
	} else {
		console.log(JSON.stringify(entry));
	}
}

export const logger = {
	info: (msg: string, fields?: Fields) => emit("info", msg, fields),
	warn: (msg: string, fields?: Fields) => emit("warn", msg, fields),
	error: (msg: string, fields?: Fields) => emit("error", msg, fields),
};

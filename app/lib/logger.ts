import { createClient } from "@supabase/supabase-js";

type LogLevel = "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db =
	supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function persist(level: LogLevel, msg: string, fields?: Fields) {
	if (!db) return;
	db.from("logs")
		.insert({ level, msg, fields: fields ?? null })
		.then(({ error }) => {
			if (error) {
				console.error(
					JSON.stringify({
						level: "error",
						msg: "failed to persist log",
						detail: error.message,
					}),
				);
			}
		});
}

function emit(level: LogLevel, msg: string, fields?: Fields) {
	const entry = { level, msg, ts: new Date().toISOString(), ...fields };
	(level === "error" ? console.error : console.log)(JSON.stringify(entry));
	persist(level, msg, fields);
}

export const logger = {
	info: (msg: string, fields?: Fields) => emit("info", msg, fields),
	warn: (msg: string, fields?: Fields) => emit("warn", msg, fields),
	error: (msg: string, fields?: Fields) => emit("error", msg, fields),
};

type LogLevel = "info" | "warn" | "error";
type Fields = Record<string, unknown>;

function emit(level: LogLevel, msg: string, fields?: Fields) {
	const entry = { level, msg, ts: new Date().toISOString(), ...fields };
	if (level === "error") {
		console.error(JSON.stringify(entry));
	} else {
		console.log(JSON.stringify(entry));
	}
}

export const logger = {
	info: (msg: string, fields?: Fields) => emit("info", msg, fields),
	warn: (msg: string, fields?: Fields) => emit("warn", msg, fields),
	error: (msg: string, fields?: Fields) => emit("error", msg, fields),
};

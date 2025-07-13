import { scheduleJob } from "node-schedule";
import { Database } from "#lib/Database.js";
import { Db as Configuration } from "#lib/Configuration.js";
import type BaseClient from "#lib/BaseClient.js";

const db = await Database.getInstance(Configuration).connect();
const scrimCollection = db.collection<Scrim>("scrims");

export async function setupScrimReminder(client: BaseClient) {
  scheduleJob("* * * * *", async () => {
    const now = new Date();
    const inTenMinutes = new Date(now.getTime() + 10 * 60 * 1000);

    const scrims = await scrimCollection.find({ status: "scheduled" }).toArray();

    for (const scrim of scrims) {
      const [dayStr, monthStr, yearStr] = scrim.date.split("/");
      const [hourStr, minuteStr] = scrim.time.split(":");

      if (!dayStr || !monthStr || !yearStr || !hourStr || !minuteStr) {
        console.warn(`⚠️ Invalid date or time format in scrim "${scrim.name}". Skipping...`);
        continue;
      }

      const day = Number(dayStr);
      const month = Number(monthStr);
      const year = Number(yearStr);
      const hour = Number(hourStr);
      const minute = Number(minuteStr);

      if (
        isNaN(day) || isNaN(month) || isNaN(year) ||
        isNaN(hour) || isNaN(minute)
      ) {
        console.warn(`⚠️ Invalid numeric conversion in scrim "${scrim.name}". Skipping...`);
        continue;
      }

      const startTimeUTC = new Date(Date.UTC(year, month - 1, day, hour, minute));

      const timeDiff = startTimeUTC.getTime() - inTenMinutes.getTime();

      if (timeDiff >= 0 && timeDiff < 60 * 1000) {
        for (const team of scrim.teams) {
          try {
            const leaderId = team.registeredBy;
            const user = await client.users.fetch(leaderId);

            if (user) {
              await user.send({
                content: `⏰ Reminder: Your team **${team.name}** is scheduled to play scrim **${scrim.name}** in **10 minutes**.\n\nPlease be ready. Good luck!`,
              });
            }
          } catch (error) {
            console.error(`❌ Could not send DM to leader ${team.registeredBy}:`, error);
          }
        }
      }
    }
  });
}

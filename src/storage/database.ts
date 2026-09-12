import { openDB, type DBSchema } from 'idb';
import type { Schedule } from '../domain/schedule';

interface LsdDatabase extends DBSchema {
  schedules: {
    key: string;
    value: Schedule;
  };
}

const DATABASE_NAME = 'lsd-local';

export function openLsdDatabase() {
  return openDB<LsdDatabase>(DATABASE_NAME, 1, {
    upgrade(database) {
      database.createObjectStore('schedules', { keyPath: 'metadata.id' });
    },
  });
}

export async function saveSchedule(schedule: Schedule) {
  const database = await openLsdDatabase();
  await database.put('schedules', schedule);
}

export async function listSchedules() {
  const database = await openLsdDatabase();
  return database.getAll('schedules');
}

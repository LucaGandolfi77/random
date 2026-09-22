const MIGRATIONS = {
  1: (state) => {
    const migrated = { ...state };
    migrated.version = 2;
    if (!migrated.stats) migrated.stats = {};
    if (!migrated.stats.booksPerRoom) migrated.stats.booksPerRoom = { salottino: 0, atrio: 0, serra: 0 };
    return migrated;
  },
  2: (state) => state
};

async function migrate(state) {
  const currentVersion = state.version || 1;
  let migrated = { ...state };

  for (let version = currentVersion; version < Object.keys(MIGRATIONS).length; version++) {
    const migrate = MIGRATIONS[version];
    if (migrate) {
      migrated = migrate(migrated);
      console.log(`[Radice] Migrated from v${version} to v${version + 1}`);
    }
  }

  migrated.version = Object.keys(MIGRATIONS).length;
  return migrated;
}

async function needsMigration(state) {
  return (state.version || 1) < Object.keys(MIGRATIONS).length;
}

export { migrate, needsMigration, MIGRATIONS };

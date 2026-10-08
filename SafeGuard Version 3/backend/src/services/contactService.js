const toApi = (r) => ({ id: r.id, name: r.name, phone: r.phone, relationship: r.relationship, isPrimary: !!r.is_primary, alertEnabled: !!r.alert_enabled });

export function contactService(db, userId) {
  const get = (id) => db.prepare('SELECT * FROM emergency_contacts WHERE id=? AND user_id=?').get(id, userId);
  const clearPrimary = (exceptId = 0) =>
    db.prepare('UPDATE emergency_contacts SET is_primary=0 WHERE user_id=? AND id<>?').run(userId, exceptId);

  return {
    list: () =>
      db.prepare('SELECT * FROM emergency_contacts WHERE user_id=? ORDER BY is_primary DESC, name').all(userId).map(toApi),

    create: db.transaction((d) => {
      const first = db.prepare('SELECT COUNT(*) c FROM emergency_contacts WHERE user_id=?').get(userId).c === 0;
      const primary = d.isPrimary || first; // the first contact is always primary
      const { lastInsertRowid: id } = db
        .prepare('INSERT INTO emergency_contacts (user_id,name,phone,relationship,is_primary,alert_enabled) VALUES (?,?,?,?,?,?)')
        .run(userId, d.name, d.phone, d.relationship, primary ? 1 : 0, d.alertEnabled ? 1 : 0);
      if (primary) clearPrimary(Number(id));
      return toApi(get(id));
    }),

    update: db.transaction((id, d) => {
      if (!get(id)) return null;
      db.prepare('UPDATE emergency_contacts SET name=?, phone=?, relationship=?, is_primary=?, alert_enabled=? WHERE id=? AND user_id=?')
        .run(d.name, d.phone, d.relationship, d.isPrimary ? 1 : 0, d.alertEnabled ? 1 : 0, id, userId);
      if (d.isPrimary) clearPrimary(id);
      return toApi(get(id));
    }),

    remove: db.transaction((id) => {
      const row = get(id);
      if (!row) return false;
      db.prepare('DELETE FROM emergency_contacts WHERE id=?').run(id);
      if (row.is_primary) { // promote another contact so one is always primary
        db.prepare(`UPDATE emergency_contacts SET is_primary=1 WHERE id=(SELECT id FROM emergency_contacts WHERE user_id=? ORDER BY name LIMIT 1)`).run(userId);
      }
      return true;
    }),
  };
}

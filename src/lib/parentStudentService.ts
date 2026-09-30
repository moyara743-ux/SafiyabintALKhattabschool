import { supabase } from '../supabaseClient';
import {
  ParentStudentRelationship,
  RelationshipType,
  UserProfile,
  SchoolRole,
} from '../types';
import { dataStore } from './dataStore';
import { logActivity } from './activityLogger';
import { ROLE_LABELS_AR } from './permissions';
import { getAllStudents } from './studentService';

const STORAGE_KEY_RELATIONSHIPS = 'safiah_parent_student_relationships';

/**
 * Local cache helper for relationships
 */
function getCachedRelationships(): ParentStudentRelationship[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_RELATIONSHIPS);
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[parentStudentService] Error reading cached relationships:', e);
  }
  return [];
}

function setCachedRelationships(data: ParentStudentRelationship[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_RELATIONSHIPS, JSON.stringify(data));
    }
  } catch (e) {
    console.warn('[parentStudentService] Error saving cached relationships:', e);
  }
}

/**
 * Extracts student IDs linked to a parent from user metadata / custom_permissions
 */
export function extractLinkedStudentIdsFromUser(user: UserProfile): string[] {
  const ids: string[] = [];
  if (Array.isArray(user.linkedStudentIds)) {
    ids.push(...user.linkedStudentIds);
  }
  if (Array.isArray(user.customPermissions)) {
    for (const p of user.customPermissions) {
      if (typeof p === 'string' && p.startsWith('parent_of:')) {
        const parts = p.split(':');
        if (parts[1]) ids.push(parts[1]);
      }
    }
  }
  return Array.from(new Set(ids));
}

/**
 * Encodes student relationship into parent user's custom_permissions for dual-persistence
 */
function encodeParentLinksIntoUser(
  user: UserProfile,
  relationships: ParentStudentRelationship[]
): UserProfile {
  const activeStudentIds = relationships
    .filter((r) => r.parent_user_id === user.id && r.is_active)
    .map((r) => r.student_user_id);

  const cleanPerms = (user.customPermissions || []).filter(
    (p) => !p.startsWith('parent_of:')
  );

  for (const r of relationships.filter((rel) => rel.parent_user_id === user.id)) {
    cleanPerms.push(`parent_of:${r.student_user_id}:${r.relationship_type}:${r.is_active ? '1' : '0'}` as any);
  }

  return {
    ...user,
    linkedStudentIds: activeStudentIds,
    customPermissions: cleanPerms,
  };
}

/**
 * Fetches relationships with strict authorization filtering.
 */
export async function getParentStudentRelationships(options?: {
  parentId?: string;
  studentId?: string;
  activeOnly?: boolean;
  currentUser?: UserProfile | null;
}): Promise<ParentStudentRelationship[]> {
  const { parentId, studentId, activeOnly = false, currentUser } = options || {};

  // STRICT ACCESS CONTROL:
  // If the requester is a parent, they CANNOT view relationships of other parents!
  if (currentUser && currentUser.school_role === 'parent') {
    if (parentId && parentId !== currentUser.id) {
      console.error('[Security DENY] Parent tried to query relationships of another parent:', {
        currentUserId: currentUser.id,
        attemptedParentId: parentId,
      });
      throw new Error('غير مصرح لك بالاطلاع على علاقات أولياء أمور آخرين (403 Forbidden).');
    }
  }

  let results: ParentStudentRelationship[] = [];
  let tableAvailable = false;

  // 1. Try querying Supabase parent_student_relationships table directly
  try {
    let query = supabase.from('parent_student_relationships').select('*');

    // If current user is a parent, restrict query at database level
    if (currentUser?.school_role === 'parent') {
      query = query.eq('parent_user_id', currentUser.id).eq('is_active', true);
    } else {
      if (parentId) query = query.eq('parent_user_id', parentId);
      if (studentId) query = query.eq('student_user_id', studentId);
      if (activeOnly) query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      tableAvailable = true;
      results = data.map((d: any) => ({
        id: d.id,
        parent_user_id: d.parent_user_id,
        student_user_id: d.student_user_id,
        relationship_type: d.relationship_type || 'guardian',
        is_active: d.is_active !== false,
        created_by: d.created_by,
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));
    }
  } catch (err) {
    console.warn('[parentStudentService] Notice querying table, using resilient database sync:', err);
  }

  // 2. Fallback & Dual-Sync: Merge with cached & decoded links from users
  if (!tableAvailable || results.length === 0) {
    const cached = getCachedRelationships();
    results = cached;
  }

  // 3. Populate student and parent profile metadata from dataStore
  const allUsers = await dataStore.getUsers();
  const usersMap = new Map<string, UserProfile>();
  allUsers.forEach((u) => usersMap.set(u.id, u));

  // Merge any links encoded in parent user profiles
  for (const u of allUsers) {
    if (u.school_role === 'parent') {
      const perms = u.customPermissions || [];
      for (const p of perms) {
        if (typeof p === 'string' && p.startsWith('parent_of:')) {
          const parts = p.split(':');
          const stId = parts[1];
          const relType = (parts[2] || 'guardian') as RelationshipType;
          const isActive = parts[3] !== '0';

          if (stId && !results.some((r) => r.parent_user_id === u.id && r.student_user_id === stId)) {
            results.push({
              id: `rel_${u.id}_${stId}`,
              parent_user_id: u.id,
              student_user_id: stId,
              relationship_type: relType,
              is_active: isActive,
              created_at: u.createdAt || new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  // Filter based on requested options
  let filtered = results;
  if (currentUser?.school_role === 'parent') {
    filtered = filtered.filter((r) => r.parent_user_id === currentUser.id && r.is_active);
  } else {
    if (parentId) filtered = filtered.filter((r) => r.parent_user_id === parentId);
    if (studentId) filtered = filtered.filter((r) => r.student_user_id === studentId);
    if (activeOnly) filtered = filtered.filter((r) => r.is_active);
  }

  // Attach student & parent profiles
  const allStudentRecords = await getAllStudents();
  const studentRecordsMap = new Map<string, any>();
  allStudentRecords.forEach((sr) => {
    studentRecordsMap.set(sr.id, sr);
    if (sr.account_user_id) studentRecordsMap.set(sr.account_user_id, sr);
  });

  const expanded = filtered.map((r) => {
    const parent = usersMap.get(r.parent_user_id);
    const userStudent = usersMap.get(r.student_user_id);
    const studentRec = studentRecordsMap.get(r.student_record_id || r.student_user_id);
    const finalStudent: UserProfile = userStudent || {
      id: studentRec?.id || r.student_user_id,
      name: studentRec?.name || 'طالبة',
      email: studentRec?.phone ? `tel:${studentRec.phone}` : '',
      phone: studentRec?.phone,
      school_role: 'student',
      status: 'active',
      gradeStage: studentRec?.grade_stage,
      createdAt: studentRec?.created_at || new Date().toISOString(),
    };

    return {
      ...r,
      parent,
      student: finalStudent,
      studentRecord: studentRec,
    };
  });

  setCachedRelationships(results);
  return expanded;
}

/**
 * Creates a link between a parent and a student with strict privilege verification.
 */
export async function linkParentToStudent(params: {
  parentId: string;
  studentId: string;
  relationshipType?: RelationshipType;
  actor: UserProfile;
}): Promise<ParentStudentRelationship> {
  const { parentId, studentId, relationshipType = 'guardian', actor } = params;

  // 1. PRIVILEGE VERIFICATION:
  // Strict rule: Parents CANNOT link themselves to any student!
  if (actor.school_role === 'parent' || actor.school_role === 'student') {
    console.error('[Security DENY] Non-admin user attempted to link parent to student:', actor);
    throw new Error('عفواً، لا يملك حسابك صلاحية ربط أولياء الأمور بالطالبات. هذه العملية محصورة بالإدارة المدرسية (403 Forbidden).');
  }

  // 2. Validate Parent & Student records
  const allUsers = await dataStore.getUsers();
  const parent = allUsers.find((u) => u.id === parentId);
  const student = allUsers.find((u) => u.id === studentId);

  if (!parent) {
    throw new Error('لم يتم العثور على حساب ولي الأمر المحدد في النظام.');
  }
  if (!student) {
    throw new Error('لم يتم العثور على حساب الطالبة المحددة في النظام.');
  }

  if (parent.school_role !== 'parent') {
    throw new Error(`المستخدم ${parent.name} ليس مسجلاً كولي أمر (الرتبة الحالية: ${ROLE_LABELS_AR[parent.school_role]}).`);
  }
  if (student.school_role !== 'student') {
    throw new Error(`المستخدمة ${student.name} ليست مسجلة كرتبة طالبة.`);
  }

  // 3. Check for duplicates
  const existing = await getParentStudentRelationships({ parentId, studentId });
  if (existing.length > 0) {
    const activeRel = existing.find((r) => r.is_active);
    if (activeRel) {
      throw new Error(`الطالبة "${student.name}" مرتبطة بالفعل بحساب ولي الأمر "${parent.name}".`);
    } else {
      // Re-activate inactive relationship
      return toggleRelationshipStatus({
        relationshipId: existing[0].id,
        parentId,
        studentId,
        isActive: true,
        actor,
      });
    }
  }

  // 4. Create new relationship
  const newRelId = crypto.randomUUID();
  const newRel: ParentStudentRelationship = {
    id: newRelId,
    parent_user_id: parentId,
    student_user_id: studentId,
    relationship_type: relationshipType,
    is_active: true,
    created_by: actor.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    parent,
    student,
  };

  // 5. Database Save 1: Supabase parent_student_relationships table
  try {
    const { error: dbErr } = await supabase.from('parent_student_relationships').insert([
      {
        id: newRelId,
        parent_user_id: parentId,
        student_user_id: studentId,
        relationship_type: relationshipType,
        is_active: true,
        created_by: actor.id,
        created_at: newRel.created_at,
        updated_at: newRel.updated_at,
      },
    ]);

    if (dbErr) {
      console.warn('[parentStudentService] Notice inserting into parent_student_relationships table:', dbErr.message);
    }
  } catch (err) {
    console.warn('[parentStudentService] Exception inserting to table:', err);
  }

  // 6. Database Save 2: Persist into parent user row in Supabase users table
  try {
    const currentCached = getCachedRelationships();
    const updatedRels = [...currentCached.filter((r) => !(r.parent_user_id === parentId && r.student_user_id === studentId)), newRel];
    setCachedRelationships(updatedRels);

    const updatedParentUser = encodeParentLinksIntoUser(parent, updatedRels);
    await dataStore.updateUser(parent.id, {
      customPermissions: updatedParentUser.customPermissions,
    });
  } catch (userSaveErr) {
    console.warn('[parentStudentService] Notice persisting links to parent user row:', userSaveErr);
  }

  // 7. Audit Logging
  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    action: 'PARENT_RELATION_CREATE',
    entity: 'parent_student_relationships',
    entityId: newRelId,
    details: `ربط ولي الأمر (${parent.name}) بالطالبة (${student.name}) بصوت القرابة (${relationshipType === 'father' ? 'أب' : relationshipType === 'mother' ? 'أم' : 'ولي أمر'})`,
  });

  return newRel;
}

/**
 * Toggles relationship active / disabled status.
 */
export async function toggleRelationshipStatus(params: {
  relationshipId: string;
  parentId: string;
  studentId: string;
  isActive: boolean;
  actor: UserProfile;
}): Promise<ParentStudentRelationship> {
  const { relationshipId, parentId, studentId, isActive, actor } = params;

  // Strict authorization
  if (actor.school_role === 'parent' || actor.school_role === 'student') {
    throw new Error('غير مصرح لك بتعديل أو تعطيل العلاقة (403 Forbidden).');
  }

  const allUsers = await dataStore.getUsers();
  const parent = allUsers.find((u) => u.id === parentId);
  const student = allUsers.find((u) => u.id === studentId);

  // 1. Update in Supabase parent_student_relationships table
  try {
    await supabase
      .from('parent_student_relationships')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', relationshipId);
  } catch (err) {
    console.warn('[parentStudentService] Notice updating table status:', err);
  }

  // 2. Update cache & parent user record
  const currentCached = getCachedRelationships();
  const updatedRels = currentCached.map((r) =>
    r.id === relationshipId || (r.parent_user_id === parentId && r.student_user_id === studentId)
      ? { ...r, is_active: isActive, updated_at: new Date().toISOString() }
      : r
  );
  setCachedRelationships(updatedRels);

  if (parent) {
    const updatedParentUser = encodeParentLinksIntoUser(parent, updatedRels);
    try {
      await dataStore.updateUser(parent.id, {
        customPermissions: updatedParentUser.customPermissions,
      });
    } catch (e) {
      console.warn('[parentStudentService] Notice updating parent user perms:', e);
    }
  }

  // 3. Audit Logging
  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    action: 'PARENT_RELATION_TOGGLE',
    entity: 'parent_student_relationships',
    entityId: relationshipId,
    details: `${isActive ? 'إعادة تفعيل' : 'تعطيل'} علاقة ولي الأمر (${parent?.name || parentId}) بالطالبة (${student?.name || studentId})`,
  });

  const updatedItem = updatedRels.find((r) => r.id === relationshipId) || {
    id: relationshipId,
    parent_user_id: parentId,
    student_user_id: studentId,
    relationship_type: 'guardian',
    is_active: isActive,
    created_at: new Date().toISOString(),
    parent,
    student,
  };

  return updatedItem;
}

/**
 * Permanently deletes a relationship.
 */
export async function deleteRelationship(params: {
  relationshipId: string;
  parentId: string;
  studentId: string;
  actor: UserProfile;
}): Promise<void> {
  const { relationshipId, parentId, studentId, actor } = params;

  // Strict authorization
  if (actor.school_role === 'parent' || actor.school_role === 'student') {
    throw new Error('غير مصرح لك بحذف علاقات أولياء الأمور (403 Forbidden).');
  }

  const allUsers = await dataStore.getUsers();
  const parent = allUsers.find((u) => u.id === parentId);
  const student = allUsers.find((u) => u.id === studentId);

  // 1. Delete from Supabase parent_student_relationships
  try {
    await supabase.from('parent_student_relationships').delete().eq('id', relationshipId);
  } catch (err) {
    console.warn('[parentStudentService] Notice deleting from table:', err);
  }

  // 2. Remove from cache & update parent user record
  const currentCached = getCachedRelationships();
  const updatedRels = currentCached.filter(
    (r) => r.id !== relationshipId && !(r.parent_user_id === parentId && r.student_user_id === studentId)
  );
  setCachedRelationships(updatedRels);

  if (parent) {
    const updatedParentUser = encodeParentLinksIntoUser(parent, updatedRels);
    try {
      await dataStore.updateUser(parent.id, {
        customPermissions: updatedParentUser.customPermissions,
      });
    } catch (e) {
      console.warn('[parentStudentService] Notice updating parent user perms:', e);
    }
  }

  // 3. Audit Logging
  await logActivity({
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    action: 'PARENT_RELATION_DELETE',
    entity: 'parent_student_relationships',
    entityId: relationshipId,
    details: `حذف نهائي لعلاقة ولي الأمر (${parent?.name || parentId}) بالطالبة (${student?.name || studentId})`,
  });
}

/**
 * Retrieves only active students linked to the given parent user ID.
 */
export async function getActiveStudentsForParent(
  parentUserId: string
): Promise<UserProfile[]> {
  const rels = await getParentStudentRelationships({
    parentId: parentUserId,
    activeOnly: true,
  });

  const students: UserProfile[] = [];
  for (const r of rels) {
    if (r.student && r.is_active) {
      students.push(r.student);
    }
  }

  return students;
}

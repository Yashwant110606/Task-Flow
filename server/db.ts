import { MongoClient, ObjectId, type Db, type Collection } from 'mongodb';
import type {
  TaskItem,
  TaskPriority,
  TaskStatus,
  UserProfile,
} from '../src/types/task.ts';

export interface TaskDoc {
  _id?: ObjectId;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserDoc {
  _id?: ObjectId;
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  createdAt: string;
  lastLoginAt: string;
}

let client: MongoClient | null = null;
let database: Db | null = null;
let connectPromise: Promise<Db> | null = null;

function mapTaskDoc(doc: TaskDoc): TaskItem {
  return {
    id: doc._id ? doc._id.toString() : '',
    userId: doc.userId,
    title: doc.title,
    description: doc.description ?? '',
    status: doc.status,
    priority: doc.priority ?? 'Medium',
    dueDate: doc.dueDate ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function connectDB(): Promise<Db> {
  if (database) {
    return database;
  }
  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error(
        'Missing MONGODB_URI environment variable.\n' +
        'Please add your MongoDB Atlas connection string to .env, e.g.:\n' +
        'MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/taskflow?retryWrites=true&w=majority'
      );
    }

    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
    });

    await client.connect();
    const dbName = process.env.MONGODB_DB_NAME || undefined;
    const db = client.db(dbName);

    const tasksCol = db.collection<TaskDoc>('tasks');
    const usersCol = db.collection<UserDoc>('users');

    try {
      await Promise.all([
        tasksCol.createIndex({ userId: 1, updatedAt: -1, _id: -1 }),
        usersCol.createIndex({ uid: 1 }, { unique: true }),
      ]);
    } catch (indexErr) {
      console.warn('Warning: Could not create MongoDB indexes automatically:', indexErr);
    }

    database = db;
    console.log('Connected to MongoDB Atlas successfully.');
    return db;
  })();

  try {
    return await connectPromise;
  } catch (err) {
    connectPromise = null;
    throw err;
  }
}

async function getCollections() {
  const db = await connectDB();
  return {
    users: db.collection<UserDoc>('users'),
    tasks: db.collection<TaskDoc>('tasks'),
  };
}

export async function upsertUser(profile: UserProfile): Promise<void> {
  const { users } = await getCollections();
  const now = new Date().toISOString();
  await users.updateOne(
    { uid: profile.uid },
    {
      $set: {
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        photoUrl: profile.photoUrl,
        lastLoginAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

export async function listTasksByUser(userId: string): Promise<TaskItem[]> {
  const { tasks } = await getCollections();
  const docs = await tasks
    .find({ userId })
    .sort({ updatedAt: -1, _id: -1 })
    .toArray();

  return docs.map(mapTaskDoc);
}

export async function getTaskById(id: string, userId: string): Promise<TaskItem | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const { tasks } = await getCollections();
  const doc = await tasks.findOne({
    _id: new ObjectId(id),
    userId,
  });

  return doc ? mapTaskDoc(doc) : null;
}

export async function createTask(
  userId: string,
  title: string,
  description: string,
  status: TaskStatus,
  priority: TaskPriority = 'Medium',
  dueDate: string | null = null
): Promise<TaskItem> {
  const { tasks } = await getCollections();
  const now = new Date().toISOString();
  const doc: TaskDoc = {
    userId,
    title,
    description,
    status,
    priority,
    dueDate,
    createdAt: now,
    updatedAt: now,
  };

  const result = await tasks.insertOne(doc);
  return {
    id: result.insertedId.toString(),
    userId,
    title,
    description,
    status,
    priority,
    dueDate,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateTask(
  id: string,
  userId: string,
  updates: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
  }
): Promise<TaskItem | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const { tasks } = await getCollections();
  const existing = await tasks.findOne({ _id: new ObjectId(id), userId });
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const setDoc: Partial<TaskDoc> = {
    updatedAt: now,
  };

  if (updates.title !== undefined) setDoc.title = updates.title;
  if (updates.description !== undefined) setDoc.description = updates.description;
  if (updates.status !== undefined) setDoc.status = updates.status;
  if (updates.priority !== undefined) setDoc.priority = updates.priority;
  if (updates.dueDate !== undefined) setDoc.dueDate = updates.dueDate;

  await tasks.updateOne(
    { _id: new ObjectId(id), userId },
    { $set: setDoc }
  );

  return getTaskById(id, userId);
}

export async function deleteTask(id: string, userId: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const { tasks } = await getCollections();
  const result = await tasks.deleteOne({
    _id: new ObjectId(id),
    userId,
  });

  return result.deletedCount > 0;
}

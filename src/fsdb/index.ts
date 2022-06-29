import fsl from 'fs'
import fsp from 'fs/promises'
import { v4 } from 'uuid'

const kData = Symbol('kData')
const kDatabase = Symbol('kDatabase')

export type GenericDatabaseType = {
  [k: string]: any[]
}

export type DatabaseRecord<T> = { _id: string } & T

type ArrayElement<T> = T extends readonly (infer ElementType)[]
  ? ElementType
  : never

type CollectionRef<T extends GenericDatabaseType, K extends keyof T> = {
  [kData]: Array<ArrayElement<T[K]>>
  [kDatabase]: FileSystemDatabase<T>
}

export default class FileSystemDatabase<T extends GenericDatabaseType> {
  public [kData]: T | null

  private constructor(private filename: string) {
    this[kData] = null
  }

  static fromRef<T extends GenericDatabaseType>(
    filename: string,
    ref: T
  ): FileSystemDatabase<T> {
    const database = new FileSystemDatabase<T>(filename)
    database[kData] = ref
    return database
  }

  static async fromFile<T extends GenericDatabaseType>(
    filename: string
  ): Promise<FileSystemDatabase<T>> {
    const database = new FileSystemDatabase<T>(filename)
    await database.load()
    return database
  }

  public async load(): Promise<void> {
    if (!fsl.existsSync(this.filename)) {
      this[kData] = {} as T

      await fsp.writeFile(this.filename, JSON.stringify(this[kData]))
    }

    this[kData] = JSON.parse(await fsp.readFile(this.filename, 'utf8'))
  }

  public async save(): Promise<void> {
    await fsp.writeFile(this.filename, JSON.stringify(this[kData]))
  }

  public async sync(): Promise<void> {
    await this.load()
  }
}

export const collection = <T extends GenericDatabaseType, K extends keyof T>(
  database: FileSystemDatabase<T>,
  key: K
): CollectionRef<T, K> => {
  if (!database[kData]![key]) {
    ;(database[kData]![key] as any) = []
  }

  return {
    [kData]: database[kData]![key],
    [kDatabase]: database,
  }
}

export const createDoc = async <
  T extends GenericDatabaseType,
  R extends keyof T
>(
  collection: CollectionRef<T, R>,
  doc: Omit<ArrayElement<T[R]>, '_id'>
) => {
  const docDto: ArrayElement<T[R]> = {
    _id: v4(),
    ...doc,
  } as any

  collection[kData].push(docDto)
  await collection[kDatabase].save()

  return docDto
}

export const updateDoc = async <
  T extends GenericDatabaseType,
  R extends keyof T
>(
  collection: CollectionRef<T, R>,
  id: string,
  doc: Partial<ArrayElement<T[R]>>
) => {
  const index = collection[kData].findIndex((item) => item._id === id)

  if (index === -1) {
    throw new Error('Record not found')
  }

  Object.assign(collection[kData][index], doc)

  await collection[kDatabase].save()
  return collection[kData][index]
}

export const getDoc = async <T extends GenericDatabaseType, R extends keyof T>(
  collection: CollectionRef<T, R>,
  id: string
) => {
  const index = collection[kData].findIndex((item) => item._id === id)

  if (index === -1) {
    throw new Error('Record not found')
  }

  return collection[kData][index]
}

export const getDocs = async <T extends GenericDatabaseType, R extends keyof T>(
  collection: CollectionRef<T, R>
) => {
  return collection[kData]
}

export const deleteDoc = async <
  T extends GenericDatabaseType,
  R extends keyof T
>(
  collection: CollectionRef<T, R>,
  id: string
) => {
  const index = collection[kData].findIndex((item) => item._id === id)

  if (index === -1) {
    throw new Error('Record not found')
  }

  collection[kData].splice(index, 1)
  await collection[kDatabase].save()
}

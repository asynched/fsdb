import { v4 } from 'uuid'
import fsl from 'fs'
import fsp from 'fs/promises'

export type GenericDatabaseType = {
  [k: string]: any[]
}

export type DatabaseRecord<T> = { _id: string } & T

type ArrayElement<T> = T extends readonly (infer ElementType)[]
  ? ElementType
  : never

export default class FileSystemDatabase<T extends GenericDatabaseType> {
  private data: T | null

  private constructor(private filename: string) {
    this.data = null
  }

  static fromRef<T extends GenericDatabaseType>(
    filename: string,
    ref: T
  ): FileSystemDatabase<T> {
    const database = new FileSystemDatabase<T>(filename)
    database.data = ref
    return database
  }

  static async fromFile<T extends GenericDatabaseType>(
    filename: string
  ): Promise<FileSystemDatabase<T>> {
    const database = new FileSystemDatabase<T>(filename)
    await database.load()
    return database
  }

  public getData(): T {
    return this.data!
  }

  public async load(): Promise<void> {
    if (!fsl.existsSync(this.filename)) {
      this.data = {} as T

      await fsp.writeFile(this.filename, JSON.stringify(this.data))
    }

    this.data = JSON.parse(await fsp.readFile(this.filename, 'utf8'))
  }

  public async save(): Promise<void> {
    await fsp.writeFile(this.filename, JSON.stringify(this.data))
  }

  public async sync(): Promise<void> {
    await this.load()
  }
}

export const collection = <T extends GenericDatabaseType, K extends keyof T>(
  database: FileSystemDatabase<T>,
  path: K
) => {
  let data: T[K]
  const dbRef = database.getData()[path]

  if (dbRef) {
    data = dbRef
  } else {
    ;(database.getData()[path] as any) = []
    data = database.getData()[path]
  }

  type DocDTO = Omit<ArrayElement<T[K]>, '_id'>

  return {
    createDoc(doc: DocDTO): void {
      const docRecord = {
        _id: v4(),
        ...doc,
      }

      data.push(docRecord)
    },
    deleteDoc(id: string) {
      data.splice(
        data.findIndex((r) => r._id === id),
        1
      )
    },
    updateDoc(id: string, record: Partial<DocDTO>) {
      const index = data.findIndex((item) => item._id === id)

      if (index === -1) {
        throw new Error('Record not found')
      }

      Object.assign(data[index], record)
    },
    getDoc(id: string): ArrayElement<T[K]> | null {
      return data.find((record) => record.id === id) || null
    },
    getDocs(): T[K] {
      return data
    },
  }
}

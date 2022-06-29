import fsl from 'fs'
import fsp from 'fs/promises'
import { v4 } from 'uuid'

const kData = Symbol('kData')
const kDatabase = Symbol('kDatabase')

type ArrayElement<T> = T extends readonly (infer ElementType)[]
  ? ElementType
  : never

export type CollectionRef<
  T extends FsDB.GenericDatabaseType,
  K extends keyof T
> = {
  [kData]: Array<ArrayElement<T[K]>>
  [kDatabase]: Database<T>
}

export default class Database<T extends FsDB.GenericDatabaseType> {
  public [kData]: T | null

  private constructor(private filename: string) {
    this[kData] = null
  }

  static fromRef<T extends FsDB.GenericDatabaseType>(
    filename: string,
    ref: T
  ): Database<T> {
    const database = new Database<T>(filename)
    database[kData] = ref
    return database
  }

  static async fromFile<T extends FsDB.GenericDatabaseType>(
    filename: string
  ): Promise<Database<T>> {
    const database = new Database<T>(filename)
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

export const collection = <
  T extends FsDB.GenericDatabaseType,
  K extends keyof T
>(
  database: Database<T>,
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
  T extends FsDB.GenericDatabaseType,
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
  T extends FsDB.GenericDatabaseType,
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

export const getDoc = async <
  T extends FsDB.GenericDatabaseType,
  R extends keyof T
>(
  collection: CollectionRef<T, R>,
  id: string
) => {
  const index = collection[kData].findIndex((item) => item._id === id)

  if (index === -1) {
    throw new Error('Record not found')
  }

  return collection[kData][index]
}

export const getDocs = async <
  T extends FsDB.GenericDatabaseType,
  R extends keyof T
>(
  collection: CollectionRef<T, R>
) => {
  return collection[kData]
}

export const deleteDoc = async <
  T extends FsDB.GenericDatabaseType,
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

export const where = <T extends FsDB.DatabaseRecord<any>>(
  key: keyof T,
  operator: FsDB.Operator,
  value: any
): FsDB.WhereClause<T> => {
  return {
    _meta: 'where',
    key,
    operator,
    value,
  }
}

export const limit = (items: number, offset = 0): FsDB.LimitClause => {
  return {
    _meta: 'limit',
    items,
    offset,
  }
}

export const orderBy = <T extends FsDB.DatabaseRecord<any>>(
  key: keyof T,
  ordering: FsDB.Ordering
): FsDB.OrderByClause<T> => {
  return {
    _meta: 'orderBy',
    key,
    ordering,
  }
}

export const query = async <
  T extends FsDB.GenericDatabaseType,
  R extends keyof T
>(
  collection: CollectionRef<T, R>,
  ...clauses: FsDB.Clause<ArrayElement<T[R]>>[]
) => {
  let items = collection[kData]

  for (const clause of clauses) {
    switch (clause._meta) {
      case 'where': {
        items = items.filter((item) => {
          const value = item[clause.key]
          switch (clause.operator) {
            case '==':
              return value === clause.value
            case '!=':
              return value !== clause.value
            case '>':
              return value > clause.value
            case '>=':
              return value >= clause.value
            case '<':
              return value < clause.value
            case '<=':
              return value <= clause.value
            case 'like':
              return value.includes?.(clause.value)
            default:
              throw new Error('Unknown operator')
          }
        })
        break
      }
      case 'orderBy': {
        items = items.sort((a, b) => {
          const aValue = a[clause.key]
          const bValue = b[clause.key]
          switch (clause.ordering) {
            case 'asc':
              return aValue > bValue ? 1 : -1
            case 'desc':
              return aValue < bValue ? 1 : -1
            default:
              throw new Error('Unknown ordering')
          }
        })
        break
      }
      case 'limit': {
        items = items.slice(clause.offset, clause.offset + clause.items)
      }
    }
  }

  return items
}

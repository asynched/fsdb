declare namespace FsDB {
  export type Collection<T> = DatabaseRecord<T>[]
  export type GenericDatabaseType = {
    [k: string]: Collection<any>
  }

  export type DatabaseRecord<T> = { _id: string } & T
}

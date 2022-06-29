declare namespace FsDB {
  export type Collection<T> = DatabaseRecord<T>[]
  export type GenericDatabaseType = {
    [k: string]: Collection<any>
  }

  export type DatabaseRecord<T> = { _id: string } & T

  export type Operator = '==' | 'like' | '>' | '<' | '>=' | '<=' | '!='
  export type Ordering = 'asc' | 'desc'

  export type WhereClause<T> = {
    _meta: 'where'
    key: keyof T
    operator: Operator
    value: any
  }

  export type OrderByClause<T> = {
    _meta: 'orderBy'
    key: keyof T
    ordering: Ordering
  }

  export type LimitClause = {
    _meta: 'limit'
    items: number
    offset: number
  }

  export type Clause<T> = WhereClause<T> | OrderByClause<T> | LimitClause
}

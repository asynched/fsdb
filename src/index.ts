import FileSystemDatabase, { collection, getDocs } from './fsdb'
import type { DatabaseRecord } from './fsdb'

type Person = {
  name: string
  age: number
}

type DatabaseType = {
  people: Array<DatabaseRecord<Person>>
}

const main = async () => {
  const database = await FileSystemDatabase.fromFile<DatabaseType>(
    'database.json'
  )

  const people = await getDocs(collection(database, 'people'))

  console.log(people)
}

main()

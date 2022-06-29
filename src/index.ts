import Database, { collection, getDocs } from './fsdb'

type Person = {
  name: string
  age: number
}

type DatabaseType = {
  people: FsDB.Collection<Person>
}

const main = async () => {
  const database = await Database.fromFile<DatabaseType>('database.json')
  const people = await getDocs(collection(database, 'people'))
  console.log(people)
}

main()

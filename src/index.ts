import Database, {
  collection,
  createDoc,
  getDocs,
  orderBy,
  query,
  where,
} from './fsdb'

type Person = {
  name: string
  age: number
}

type DatabaseType = {
  people: FsDB.Collection<Person>
}

const main = async () => {
  const database = await Database.fromFile<DatabaseType>('database.json')
  const peopleRef = collection(database, 'people')

  const people = await query(
    peopleRef,
    where('name', 'like', 'Ed'),
    where('age', '<', '30'),
    orderBy('age', 'desc')
  )

  console.log(people)
}

main()

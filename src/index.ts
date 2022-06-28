import FileSystemDatabase, { collection } from './lib/index'
import type { DatabaseRecord } from './lib/index'

type Person = {
  name: string
  age: number
}

type DatabaseType = {
  people: Array<DatabaseRecord<Person>>
}

FileSystemDatabase.fromFile<DatabaseType>('database.json').then(async (db) => {
  const peopleRef = collection(db, 'people')

  peopleRef.createDoc({
    name: 'Eder',
    age: 20,
  })

  const people = peopleRef.getDocs()

  console.log(people)
})

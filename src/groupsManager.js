const fs = require('fs')
const path = require('path')

class GroupsManager {
  constructor () {
    this.saveLock = ''
    try {
      this.groups = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), './groups.data')).toString())
    } catch (e) {
      this.groups = []
    }
  }

  _save () {
    if (this.saveLock) return
    this.saveLock = setTimeout(() => {
      fs.writeFile(path.resolve(process.cwd(), './groups.data'), JSON.stringify(this.groups), err => {
        // Unlock
        this.saveLock = ''
        if (err) console.log(err)
      })
    }, 0)
  }

  _set (group) {
    let len = this.groups.length
    while (len--) {
      if (this.groups[len].id === group.id) {
        this.groups[len] = group
        return
      }
    }
    this.groups.push(group)
  }

  update (id, opts) {
    let group = {
      id,
      name: opts.name
    }
    this._set(group)
    this._save()
  }

  delete (id) {
    let len = this.groups.length
    while (len--) {
      if (this.groups[len].id === id) {
        delete this.groups[len]
        return
      }
    }
  }
}

module.exports = new GroupsManager()

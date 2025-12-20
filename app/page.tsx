"use client";

import Image from "next/image";
import { use, useEffect, useState} from "react";

interface User {
  id: number;
  name: string;
  email: string;
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const fetchUsers = async () => {
    const response = await fetch('/api/users', {
      method: 'GET',
    }).then(res => res.json());
    setUsers(response.users);
  };
  
  
  const onFieldChange = async (id: number, el: string, value: string) => {
    const obj: { id: number, name?: string, email?: string } = {
      id,
    };

    if (el === 'name') {
      obj.name = value;
    } else if (el === 'email') {
      obj.email = value;
    }

    const response = await fetch('/api/users', {
      method: 'PATCH',
      body: JSON.stringify(obj),
    }).then(res => res.json());
    setUsers([response.user]);
    // console.log(response);
    
    
  };

  useEffect(() => {
    fetchUsers();
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      {users.map((user:User) => {
        return (
          <div key={user.id}>
            <input type="text" defaultValue={user.name} onBlur={(event) => {
              onFieldChange(user.id, 'name', event.target.value)
            }} />
            <input type="text" defaultValue={user.email} onBlur={(event) => {
              onFieldChange(user.id, 'email', event.target.value)
            }} />
            {/* <p>{user.useState}</p> */}
          </div>
        );
      })}
    </div>
  );
}

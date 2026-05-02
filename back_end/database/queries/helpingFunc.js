const doQuery = require("../query");







async function getRole(id){
    const sql=`SELECT role FROM users WHERE id=?`
    const role=await doQuery(sql,[id])
    return role[0]?.role
}


module.exports={getRole}
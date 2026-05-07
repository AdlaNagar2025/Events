const doQuery = require("../query");







async function getRole(id){
    const sql=`SELECT role FROM users WHERE id=?`
    const role=await doQuery(sql,[id])
    return role[0]?.role
}

// STATUS enum('PENDING', 'REJECTED', 'APPROVED', 'CANCELED'...
// async function getStatusEvent(eventId) {
//     const hallStatus = `SELECT status WHERE event_id=?`;
//     const chiefsStatus=`SELECT status WHERE event_id=?` //arry 
//     if(hallStatus==="PENDING")
//     const finalStatus="PENDING"

// }


module.exports={getRole}
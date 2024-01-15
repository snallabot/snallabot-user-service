export const AUTH_SOURCE = 317239
export const CLIENT_SECRET = "U02zL2khwlgFdODLWCyLPmccOc5EiPBBYcEwCqKDTWBrZj2Fwcx4b4Zd9rsA6lHLkIU4qlVvNh84olij"
export const REDIRECT_URL = "http://127.0.0.1/success"
export const CLIENT_ID = "MaddenCompanionApp19"
export const MACHINE_KEY = "MCA4b35d75Vm-MCA"
export const EA_LOGIN_URL = `https://accounts.ea.com/connect/auth?hide_create=true&release_type=prod&response_type=code&redirect_uri=${REDIRECT_URL}&client_id=${CLIENT_ID}&machineProfileKey=${MACHINE_KEY}&authentication_source=${AUTH_SOURCE}`

export const TWO_DIGIT_YEAR = "24"
export const YEAR = "2024"

export const VALID_ENTITLEMENTS = ((a: string) => ({
    xone: `MADDEN_${a}XONE`,
    ps4: `MADDEN_${a}PS4`,
    pc: `MADDEN_${a}PC`,
    ps5: `MADDEN_${a}PS5`,
    xbsx: `MADDEN_${a}XBSX`,
    stadia: `MADDEN_${a}SDA`,
}))(TWO_DIGIT_YEAR)

export const SYSTEM_MAP = (a: string) => ({
    xone: `MADDEN_${a}_XONE_BLZ_SERVER`,
    ps4: `MADDEN_${a}_PS4_BLZ_SERVER`,
    pc: `MADDEN_${a}_PC_BLZ_SERVER`,
    ps5: `MADDEN_${a}_PS5_BLZ_SERVER`,
    xbsx: `MADDEN_${a}_XBSX_BLZ_SERVER`,
    stadia: `MADDEN_${a}_SDA_BLZ_SERVER`,
})

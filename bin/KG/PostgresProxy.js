/*

# /bin/bash

if [[ -z "${1}" ]];then
    echo "Usage: sqlserver2postgresql.sh <file> <output_dir>"
    exit 1
fi

if [[ -z "${2}" ]];then
    echo "Usage: sqlserver2postgresql.sh <file> <output_dir>"
    exit 1
fi

if [[ ! -f "${1}" ]];then
    echo "File ${1} do not exists"
    exit 1
fi

# define variables
TMPDIR=$(mktemp -d)
TMPSCRIPT=${TMPDIR}/script.sql
SQL2PG=${TMPDIR}/sqlserver2pgsql.pl
OUTPUTDIR=${2}

# cp script
cp ${1} ${TMPSCRIPT}

# create output dir
mkdir -p ${OUTPUTDIR}

# convert to unix
dos2unix ${TMPSCRIPT}

# remove sys.sp_addrolemember
sed -ie '/^sys\.sp_addrolemember/,+1d' ${TMPSCRIPT}

# download script
wget --quiet https://raw.githubusercontent.com/dalibo/sqlserver2pgsql/master/sqlserver2pgsql.pl \
    --output-document ${SQL2PG}

# convert
perl -w ${SQL2PG} -f ${TMPSCRIPT} \
    -b ${OUTPUTDIR}/output_before_script.sql \
    -a ${OUTPUTDIR}/output_after_script.sql \
    -u ${OUTPUTDIR}/output_unsure_script.sql

 */

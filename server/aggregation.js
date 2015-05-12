agg = function agg(){
  pipeline =
    [
        {'$project':
            {
                '_id': 0,
                'value': '$value',
                'mbId': '$_id.mbId',
                'cc': '$_id.cc',
                'title': '$value.title'
            }
        },
        {
            '$out': 'testTable'
        }
    ],
    {
        allowDiskUse: 1
    };

  npCountry_org.aggregate(pipeline);
}
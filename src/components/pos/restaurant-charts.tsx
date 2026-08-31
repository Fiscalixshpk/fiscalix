'use client'
import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface HourlySale { hour: string; total: number; count: number }

const DONUT_COLORS = ['#5B21B6','#10B981','#F59E0B']

export function SalesLineChart({ data, totalToday }: { data: HourlySale[]; totalToday: number }) {
  const chartData = data.length > 0 ? data : [
    {hour:'09:00',total:0,count:0},{hour:'11:00',total:totalToday*0.2,count:2},
    {hour:'13:00',total:totalToday*0.5,count:5},{hour:'15:00',total:totalToday*0.7,count:4},
    {hour:'18:00',total:totalToday*0.9,count:6},{hour:'21:00',total:totalToday,count:3},
  ]
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={chartData}>
        <XAxis dataKey="hour" tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
        <YAxis hide/>
        <Tooltip formatter={(v:number)=>[`€${v.toFixed(2)}`,'Total']}
          contentStyle={{background:'white',border:'1px solid #E5E7EB',borderRadius:10,fontSize:12}}/>
        <Line dataKey="total" stroke="#5B21B6" strokeWidth={2.5} dot={false}/>
        <Line dataKey="count" stroke="#F59E0B" strokeWidth={2} dot={false}/>
      </LineChart>
    </ResponsiveContainer>
  )
}

export function IncomePieChart({ data, total }: { data:{name:string;value:number}[]; total: number }) {
  const d = data.filter(x=>x.value>0)
  return (
    <div style={{position:'relative'}}>
      <PieChart width={160} height={160} style={{margin:'0 auto'}}>
        <Pie data={d.length>0?d:[{name:'—',value:1}]} cx={80} cy={80} innerRadius={52} outerRadius={72} dataKey="value" strokeWidth={0}>
          {(d.length>0?d:[{name:'—',value:1}]).map((_,i)=>(
            <Cell key={i} fill={d.length>0?DONUT_COLORS[i]:'#E5E7EB'}/>
          ))}
        </Pie>
      </PieChart>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <p style={{fontSize:15,fontWeight:900,color:'#1E1B4B'}}>€{total.toFixed(2)}</p>
      </div>
    </div>
  )
}

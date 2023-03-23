import org.apache.jena.rdf.model.Model ;
import org.apache.jena.rdf.model.ModelFactory ;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.StmtIterator;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.rdf.model.impl.StmtIteratorImpl;
import java.util.*;
import java.net.*;
import java.io.FileWriter;
import java.io.*;
import java.io.IOException;



public class rdf2triples
{

 public static String GetText(String url) throws Exception {
                URL website = new URL(url);
                URLConnection connection = website.openConnection();
             BufferedReader in = new BufferedReader(
                                        new InputStreamReader(
                                            connection.getInputStream()));
                StringBuilder response = new StringBuilder();
                String inputLine;
                while ((inputLine = in.readLine()) != null)
                    response.append(inputLine);
                in.close();
                return response.toString();
            }


    public static void main(String[] args) {

        Model m = ModelFactory.createDefaultModel() ;

		String fileName=args[0];




 ArrayList<List> allLines = new ArrayList<List>();
try{

   m.read(fileName);
  StmtIterator sIter = m.listStatements();
   String str="";
   int i=0;


   while (sIter.hasNext()){
  	 Statement statement =sIter.next();
  	 if(i++>0)
  		str+=",\n" ;
  	String objectStr="";
  	RDFNode objectNode=statement.getObject();

  	if(objectNode.isResource())
  		objectStr="<"+objectNode.toString()+">";
  	else
  		objectStr="'"+objectNode.toString().replaceAll("'","")+"'";
  		objectStr=objectStr.replaceAll("\n","");
  		objectStr=objectStr.replaceAll("\r","");
  		objectStr=objectStr.replaceAll("\"","");
  		objectStr=objectStr.replaceAll("\\\\","");


  		ArrayList<String> line = new ArrayList<String>();
  		line.add("\"<"+statement.getSubject().toString()+">\"");
  		line.add("\"<"+statement.getPredicate().toString()+">\"");
  		line.add("\""+objectStr+"\"");

  allLines.add(line);
  }


   System.out.println(allLines.toString());

}
catch(Exception e){
System.out.println("["+allLines.toString()+"]");
}


 
 

}
}